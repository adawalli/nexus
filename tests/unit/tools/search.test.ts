/* eslint-disable import/order -- mock.module must precede mocked module imports */
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  openRouterMockFactory,
  winstonMockFactory,
  createMockApiResponse,
  TEST_API_KEY,
} from '../../fixtures/index.js';

mock.module('../../../src/clients/openrouter', openRouterMockFactory);
mock.module('winston', winstonMockFactory);

import {
  SearchTool,
  createSearchTool,
  performSearch,
} from '../../../src/tools/search';
import type { ChatCompletionResponse } from '../../../src/types/openrouter';
import {
  setupSearchToolTest,
  type MockOpenRouterClient,
} from '../../utils/test-helpers.js';

describe('SearchTool', () => {
  let searchTool: SearchTool;
  let mockClient: MockOpenRouterClient;

  beforeEach(async () => {
    const setup = await setupSearchToolTest(TEST_API_KEY);
    searchTool = setup.searchTool;
    mockClient = setup.mockClient;
  });

  const mockApiResponse: ChatCompletionResponse = createMockApiResponse(
    'perplexity/sonar',
    {
      id: 'test-123',
      content: 'This is a test response with source https://example.com',
    }
  );

  describe('constructor', () => {
    it('should create SearchTool with API key', () => {
      expect(searchTool).toBeInstanceOf(SearchTool);
    });

    it('should initialize OpenRouter client with correct config', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      const MockClient =
        openRouterModule.OpenRouterClient as unknown as ReturnType<typeof mock>;
      expect(MockClient).toHaveBeenCalledWith({
        apiKey: TEST_API_KEY,
        userAgent: 'nexus-mcp/1.0.0',
        timeout: 30000,
        maxRetries: 3,
      });
    });
  });

  describe('search', () => {
    it('should perform successful search with valid input', async () => {
      mockClient.chatCompletions.mockResolvedValue(mockApiResponse);

      const input = {
        query: 'test query',
        model: 'sonar' as const,
        maxTokens: 1000,
        temperature: 0.3,
      };

      const result = await searchTool.search(input);

      expect(result.success).toBe(true);
      expect(result.result?.content).toBe(
        'This is a test response with source https://example.com'
      );
      expect(result.result?.metadata.query).toBe('test query');
      expect(result.result?.metadata.model).toBe('perplexity/sonar');
      expect(result.requestId).toBe('test-123');
    });

    it('should apply defaults for optional parameters', async () => {
      mockClient.chatCompletions.mockResolvedValue(mockApiResponse);

      const input = { query: 'test query' };
      await searchTool.search(input);

      expect(mockClient.chatCompletions).toHaveBeenCalledWith({
        model: 'perplexity/sonar',
        messages: [{ role: 'user', content: 'test query' }],
        temperature: 0.3,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: undefined,
        stream: false,
      });
    });

    it('should handle validation errors', async () => {
      const input = { query: '' };

      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('must be at least 1 character');
    });

    it('should handle authentication errors', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      mockClient.chatCompletions.mockRejectedValue(
        new openRouterModule.AuthenticationError('Invalid API key')
      );

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');
      expect(result.error).toBe('Authentication failed: Invalid API key');
    });

    it('should handle rate limit errors', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      mockClient.chatCompletions.mockRejectedValue(
        new openRouterModule.RateLimitError('Rate limited', 60)
      );

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.error).toBe('Rate limit exceeded (retry after 60s)');
    });

    it('should handle server errors', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      mockClient.chatCompletions.mockRejectedValue(
        new openRouterModule.ServerError('Internal server error', 500, 500)
      );

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('api');
      expect(result.error).toBe('OpenRouter service temporarily unavailable');
    });

    it('should handle generic OpenRouterApiError', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      mockClient.chatCompletions.mockRejectedValue(
        new openRouterModule.OpenRouterApiError(
          'Bad request',
          400,
          'invalid_request',
          400
        )
      );

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('api');
      expect(result.error).toBe('API error: Bad request');
    });

    it('should handle timeout errors', async () => {
      mockClient.chatCompletions.mockRejectedValue(
        new Error('Request timeout after 30000ms')
      );

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
      expect(result.error).toBe('Request timed out - please try again');
    });

    it('should handle network errors', async () => {
      mockClient.chatCompletions.mockRejectedValue(
        new Error('Network error: Connection failed')
      );

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toBe('Network error - please check your connection');
    });

    it('should handle unknown errors', async () => {
      mockClient.chatCompletions.mockRejectedValue(new Error('Unknown error'));

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(result.error).toBe('Unknown error');
    });

    it('should handle invalid input format', async () => {
      const input = 'not an object';
      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
    });

    it('should measure response time', async () => {
      mockClient.chatCompletions.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve(mockApiResponse), 100)
          )
      );

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.responseTime).toBeGreaterThan(90);
    });

    it('should deduplicate concurrent identical requests', async () => {
      mockClient.chatCompletions.mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve(mockApiResponse), 50))
      );

      const input = { query: 'concurrent test query' };

      const promises = [
        searchTool.search(input),
        searchTool.search(input),
        searchTool.search(input),
      ];

      const results = await Promise.all(promises);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[0].requestId).toBe(results[1].requestId);
      expect(results[0].requestId).toBe(results[2].requestId);

      expect(mockClient.chatCompletions).toHaveBeenCalledTimes(1);

      const stats = searchTool.getDeduplicationStats();
      expect(stats.uniqueRequests).toBe(1);
      expect(stats.deduplicatedRequests).toBe(2);
      expect(stats.deduplicationRatio).toBe(2 / 3);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockClient.testConnection.mockResolvedValue(true);

      const result = await searchTool.testConnection();
      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockClient.testConnection.mockResolvedValue(false);

      const result = await searchTool.testConnection();
      expect(result).toBe(false);
    });

    it('should return false for connection error', async () => {
      mockClient.testConnection.mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await searchTool.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getClientInfo', () => {
    it('should return client configuration without API key', () => {
      mockClient.getHeaders.mockReturnValue({
        Authorization: 'Bearer sk-or-test',
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent',
      });

      const info = searchTool.getClientInfo();

      expect(info.headers['Authorization']).toBeUndefined();
      expect(info.headers['Content-Type']).toBe('application/json');
      expect(info.headers['User-Agent']).toBe('test-agent');
      expect(info.baseUrl).toBe('https://openrouter.ai/api/v1');
    });
  });

  describe('getDeduplicationStats', () => {
    it('should return deduplication statistics', () => {
      const stats = searchTool.getDeduplicationStats();

      expect(stats).toMatchObject({
        pendingRequests: expect.any(Number),
        deduplicatedRequests: expect.any(Number),
        uniqueRequests: expect.any(Number),
        maxConcurrentRequests: expect.any(Number),
        deduplicationRatio: expect.any(Number),
      });
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = searchTool.getCacheStats();

      expect(stats).toMatchObject({
        hits: expect.any(Number),
        misses: expect.any(Number),
        size: expect.any(Number),
        maxSize: expect.any(Number),
        hitRatio: expect.any(Number),
      });
    });
  });

  describe('getPerformanceMetrics', () => {
    const metricsApiResponse = createMockApiResponse('perplexity/sonar', {
      id: 'metrics-test-123',
      content: 'Test response for metrics with https://example.com',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25,
      },
    });

    it('should return performance metrics', () => {
      const metrics = searchTool.getPerformanceMetrics();

      expect(metrics).toMatchObject({
        averageProcessingTime: expect.any(Number),
        averageSourceCount: expect.any(Number),
        averageContentLength: expect.any(Number),
        averageMemoryUsage: expect.any(Number),
        totalRequests: expect.any(Number),
      });
      expect(metrics).toHaveProperty('slowestRequest');
      expect(metrics).toHaveProperty('fastestRequest');
    });

    it('should track metrics after search operations', async () => {
      mockClient.chatCompletions.mockResolvedValue(metricsApiResponse);

      await searchTool.search({ query: 'test query for metrics' });

      const metrics = searchTool.getPerformanceMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageContentLength).toBeGreaterThan(0);
      expect(metrics.slowestRequest).toBeDefined();
      expect(metrics.fastestRequest).toBeDefined();
    });

    it('should clear performance metrics', async () => {
      mockClient.chatCompletions.mockResolvedValue(metricsApiResponse);

      await searchTool.search({ query: 'test query' });

      let metrics = searchTool.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);

      searchTool.clearPerformanceMetrics();

      metrics = searchTool.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.averageProcessingTime).toBe(0);
    });
  });
});

describe('Factory Functions', () => {
  describe('createSearchTool', () => {
    it('should create SearchTool instance', () => {
      const tool = createSearchTool('test-api-key');
      expect(tool).toBeInstanceOf(SearchTool);
    });
  });

  describe('performSearch', () => {
    it('should perform search with factory function', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      const MockClient = openRouterModule.OpenRouterClient as unknown as {
        mock: { results: Array<{ value: any }> };
      };
      const mockClientInstance =
        MockClient.mock.results[MockClient.mock.results.length - 1].value;

      const mockResponse = createMockApiResponse('perplexity/sonar', {
        id: 'test-123',
        content: 'Test response',
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      });

      mockClientInstance.chatCompletions.mockResolvedValue(mockResponse);

      const result = await performSearch('test query', 'test-api-key', {
        temperature: 0.5,
      });

      expect(result.success).toBe(true);
      expect(result.result?.content).toBe('Test response');
      expect(result.result?.metadata.temperature).toBe(0.5);
    });
  });
});
