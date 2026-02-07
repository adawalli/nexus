import { describe, it, expect, beforeEach, mock } from 'bun:test';

import { SearchTool } from '../../src/tools/search';
import { validateSearchResponse } from '../../src/types/search';
import {
  TEST_API_KEY,
  createMockFetchResponse,
  createMockFetchErrorResponse,
} from '../fixtures/index.js';
import { setupIntegrationSearchTest } from '../utils/test-helpers.js';

const mockFetch = mock(() => {});
global.fetch = mockFetch;

describe('Grok 4 Integration Tests', () => {
  let searchTool: SearchTool;

  beforeEach(async () => {
    mockFetch.mockClear();
    searchTool = await setupIntegrationSearchTest(TEST_API_KEY);
  });

  describe('End-to-End Search Flow with Grok 4', () => {
    it('should complete full search workflow with grok-4 model', async () => {
      const mockApiResponse = createMockFetchResponse('x-ai/grok-4', {
        id: 'chatcmpl-grok4-test',
        content: `Based on my training knowledge, here is information about AI development.

Key developments in AI include:
- Large language models with advanced reasoning
- Improved code generation capabilities
- Multi-modal understanding systems

This response is generated from training data, not real-time web search.`,
        usage: { prompt_tokens: 12, completion_tokens: 80, total_tokens: 92 },
      });

      mockFetch.mockResolvedValue(mockApiResponse);

      const searchInput = {
        query: 'What are the key developments in AI?',
        model: 'grok-4' as const,
        maxTokens: 1000,
        temperature: 0.3,
      };

      const result = await searchTool.search(searchInput);

      expect(validateSearchResponse(result)).toBe(true);
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      const searchResult = result.result!;

      expect(searchResult.content).toContain('AI');
      expect(searchResult.metadata.query).toBe(searchInput.query);
      expect(searchResult.metadata.model).toBe('x-ai/grok-4');
      expect(searchResult.metadata.temperature).toBe(searchInput.temperature);
      expect(searchResult.metadata.maxTokens).toBe(searchInput.maxTokens);
      expect(searchResult.metadata.usage?.total_tokens).toBe(92);
      expect(searchResult.metadata.responseTime).toBeGreaterThan(0);

      expect(searchResult.metadata.timeout).toBe(60000);
      expect(searchResult.metadata.costTier).toBe('premium');
      expect(searchResult.metadata.searchType).toBe('training-data');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"model":"x-ai/grok-4"'),
        })
      );
    });

    it('should correctly differentiate searchType between Perplexity and Grok 4', async () => {
      // Test Perplexity model (realtime search)
      const perplexityResponse = createMockFetchResponse('perplexity/sonar', {
        id: 'chatcmpl-sonar',
        content: 'Real-time search results.\n\nSources:\nhttps://example.com',
      });

      mockFetch.mockResolvedValue(perplexityResponse);

      const perplexityResult = await searchTool.search({
        query: 'test query',
        model: 'sonar',
      });

      expect(perplexityResult.success).toBe(true);
      expect(perplexityResult.result?.metadata.searchType).toBe('realtime');

      mockFetch.mockClear();

      // Test Grok 4 model (training-data)
      const grokResponse = createMockFetchResponse('x-ai/grok-4', {
        id: 'chatcmpl-grok4',
        content: 'Training data based response.',
      });

      mockFetch.mockResolvedValue(grokResponse);

      const grokResult = await searchTool.search({
        query: 'test query',
        model: 'grok-4',
      });

      expect(grokResult.success).toBe(true);
      expect(grokResult.result?.metadata.searchType).toBe('training-data');

      mockFetch.mockClear();
    });

    it('should allow timeout override for grok-4 model', async () => {
      const mockApiResponse = createMockFetchResponse('x-ai/grok-4', {
        id: 'chatcmpl-grok4-timeout',
        content: 'Response with custom timeout.',
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      });

      mockFetch.mockResolvedValue(mockApiResponse);

      const customTimeout = 120000;

      const result = await searchTool.search({
        query: 'test query with custom timeout',
        model: 'grok-4',
        timeout: customTimeout,
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(customTimeout);
      expect(result.result?.metadata.model).toBe('x-ai/grok-4');
    });
  });

  describe('Error Handling for Grok 4', () => {
    it('should handle API errors gracefully for grok-4 model', async () => {
      const mockErrorResponse = createMockFetchErrorResponse(401, {
        code: 401,
        message: 'Invalid API key',
        type: 'authentication_error',
      });

      mockFetch.mockResolvedValue(mockErrorResponse);

      const result = await searchTool.search({
        query: 'test query',
        model: 'grok-4',
      });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');
    });
  });
});
