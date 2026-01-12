import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchTool } from '../../src/tools/search';
import { validateSearchResponse } from '../../src/types/search';

const mockApiKey = 'sk-or-test-grok4-integration-key-12345678';

// Mock the fetch function for integration testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Grok 4 Integration Tests', () => {
  let searchTool: SearchTool;

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.OPENROUTER_API_KEY = mockApiKey;

    // Reset ConfigurationManager singleton
    const { ConfigurationManager } = await import('../../src/config/manager');
    ConfigurationManager['instance'] = null;

    searchTool = new SearchTool(mockApiKey);
  });

  describe('End-to-End Search Flow with Grok 4', () => {
    it('should complete full search workflow with grok-4 model', async () => {
      // Mock successful API response from Grok 4
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-grok4-test',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'x-ai/grok-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `Based on my training knowledge, here is information about AI development.

Key developments in AI include:
- Large language models with advanced reasoning
- Improved code generation capabilities
- Multi-modal understanding systems

This response is generated from training data, not real-time web search.`,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 80,
            total_tokens: 92,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockApiResponse);

      const searchInput = {
        query: 'What are the key developments in AI?',
        model: 'grok-4' as const,
        maxTokens: 1000,
        temperature: 0.3,
      };

      const result = await searchTool.search(searchInput);

      // Validate the response structure
      expect(validateSearchResponse(result)).toBe(true);
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      const searchResult = result.result!;

      // Verify content is present
      expect(searchResult.content).toContain('AI');

      // Verify metadata is correct for Grok 4
      expect(searchResult.metadata.query).toBe(searchInput.query);
      expect(searchResult.metadata.model).toBe('x-ai/grok-4');
      expect(searchResult.metadata.temperature).toBe(searchInput.temperature);
      expect(searchResult.metadata.maxTokens).toBe(searchInput.maxTokens);
      expect(searchResult.metadata.usage?.total_tokens).toBe(92);
      expect(searchResult.metadata.responseTime).toBeGreaterThan(0);

      // Verify Grok 4 specific metadata
      expect(searchResult.metadata.timeout).toBe(60000); // 60s for grok-4
      expect(searchResult.metadata.costTier).toBe('premium');
      expect(searchResult.metadata.searchType).toBe('training-data');

      // Verify API call was made with correct model identifier
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
      const perplexityResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-sonar',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'perplexity/sonar',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content:
                  'Real-time search results.\n\nSources:\nhttps://example.com',
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      };

      mockFetch.mockResolvedValue(perplexityResponse);

      const perplexityResult = await searchTool.search({
        query: 'test query',
        model: 'sonar',
      });

      expect(perplexityResult.success).toBe(true);
      expect(perplexityResult.result?.metadata.searchType).toBe('realtime');

      // Reset mock for Grok 4 test
      vi.clearAllMocks();

      // Test Grok 4 model (training-data)
      const grokResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-grok4',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'x-ai/grok-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Training data based response.',
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      };

      mockFetch.mockResolvedValue(grokResponse);

      const grokResult = await searchTool.search({
        query: 'test query',
        model: 'grok-4',
      });

      expect(grokResult.success).toBe(true);
      expect(grokResult.result?.metadata.searchType).toBe('training-data');
    });

    it('should allow timeout override for grok-4 model', async () => {
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-grok4-timeout',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'x-ai/grok-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Response with custom timeout.',
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        }),
      };

      mockFetch.mockResolvedValue(mockApiResponse);

      const customTimeout = 120000; // 2 minutes instead of default 60s

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
      // Mock API error response - 401 auth error doesn't retry
      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 401,
            message: 'Invalid API key',
            type: 'authentication_error',
          },
        }),
      };

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
