import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchTool } from '../../src/tools/search';
import { validateSearchResponse } from '../../src/types/search';

// Mock OpenRouter API responses
const mockApiKey = 'sk-or-test-integration-key-12345678901234';

// Mock the fetch function for integration testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Search Tool Integration', () => {
  let searchTool: SearchTool;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set environment variable for configuration
    process.env.OPENROUTER_API_KEY = mockApiKey;

    // Reset ConfigurationManager singleton
    const { ConfigurationManager } = await import('../../src/config/manager');
    ConfigurationManager['instance'] = null;

    searchTool = new SearchTool(mockApiKey);
  });

  describe('End-to-End Search Flow', () => {
    it('should complete full search workflow successfully', async () => {
      // Mock successful API response
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-test-123',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'perplexity/sonar',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `Based on the latest information, artificial intelligence (AI) continues to evolve rapidly in 2024.

Key developments include:
- Advanced language models with improved reasoning capabilities
- Integration of AI in healthcare, education, and business processes
- Enhanced safety measures and ethical AI frameworks

Sources:
https://example.com/ai-news-2024
https://techjournal.org/ai-developments

This information reflects the current state of AI technology and its applications across various industries.`,
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 120,
            total_tokens: 135,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockApiResponse);

      const searchInput = {
        query: 'What are the latest developments in AI technology?',
        model: 'sonar' as const,
        maxTokens: 1500,
        temperature: 0.3,
      };

      const result = await searchTool.search(searchInput);

      // Validate the response structure
      expect(validateSearchResponse(result)).toBe(true);
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      const searchResult = result.result!;

      // Verify content and sources
      expect(searchResult.content).toContain('artificial intelligence');
      expect(searchResult.sources).toHaveLength(2);
      expect(searchResult.sources[0].url).toBe(
        'https://example.com/ai-news-2024'
      );
      expect(searchResult.sources[1].url).toBe(
        'https://techjournal.org/ai-developments'
      );

      // Verify metadata
      expect(searchResult.metadata.query).toBe(searchInput.query);
      expect(searchResult.metadata.model).toBe('perplexity/sonar'); // Model is mapped to OpenRouter identifier
      expect(searchResult.metadata.temperature).toBe(searchInput.temperature);
      expect(searchResult.metadata.maxTokens).toBe(searchInput.maxTokens);
      expect(searchResult.metadata.usage?.total_tokens).toBe(135);
      expect(searchResult.metadata.responseTime).toBeGreaterThan(0);

      // Verify API call was made correctly with mapped model identifier
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            model: 'perplexity/sonar', // User-friendly 'sonar' maps to OpenRouter identifier
            messages: [
              {
                role: 'user',
                content: searchInput.query,
              },
            ],
            temperature: searchInput.temperature,
            max_tokens: searchInput.maxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stream: false,
          }),
        })
      );
    });

    it('should handle API error responses correctly', async () => {
      // Mock API error response
      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 401,
            message: 'Invalid authentication credentials',
            type: 'authentication_error',
          },
        }),
      };

      mockFetch.mockResolvedValue(mockErrorResponse);

      const searchInput = {
        query: 'test query',
      };

      const result = await searchTool.search(searchInput);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');
      expect(result.error).toBe('Authentication failed: Invalid API key');
    });

    it('should handle rate limiting correctly', async () => {
      // Mock rate limit response
      const mockRateLimitResponse = {
        ok: false,
        status: 429,
        headers: {
          get: (header: string) => (header === 'retry-after' ? '60' : null),
        },
        json: vi.fn().mockResolvedValue({
          error: {
            code: 429,
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
          },
        }),
      };

      mockFetch.mockResolvedValue(mockRateLimitResponse);

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.error).toContain('Rate limit exceeded');
    }, 10000);

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      const result = await searchTool.search({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toContain('Network error');
    }, 10000);

    it('should validate input parameters end-to-end', async () => {
      const invalidInputs = [
        { query: '' }, // Empty query
        { query: 'test', maxTokens: 0 }, // Invalid maxTokens
        { query: 'test', temperature: 3 }, // Invalid temperature
        { query: 'test', model: 'invalid-model' }, // Invalid model
      ];

      for (const input of invalidInputs) {
        const result = await searchTool.search(input);
        expect(result.success).toBe(false);
        expect(result.errorType).toBe('validation');
      }
    });

    it('should extract sources correctly from various content formats', async () => {
      const contentWithSources = `Here's information about climate change:

Climate change refers to long-term shifts in global temperatures and weather patterns.
According to recent studies, temperatures have risen by 1.1°C since the late 1800s.
Source: https://climate.nasa.gov/latest-research

Additional information can be found at:
- https://www.ipcc.ch/reports
- https://unfccc.int/climate-action

For more details, see the comprehensive report at https://www.nature.com/climate-science`;

      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'test-sources',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'perplexity/sonar',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: contentWithSources,
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await searchTool.search({
        query: 'climate change research',
      });

      expect(result.success).toBe(true);
      expect(result.result?.sources).toHaveLength(4);

      const urls = result.result?.sources.map(s => s.url) || [];
      expect(urls).toContain('https://climate.nasa.gov/latest-research');
      expect(urls).toContain('https://www.ipcc.ch/reports');
      expect(urls).toContain('https://unfccc.int/climate-action');
      expect(urls).toContain('https://www.nature.com/climate-science');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const mockModelsResponse = {
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'perplexity/sonar',
              name: 'Llama 3.1 Sonar Small',
            },
          ],
        }),
      };

      mockFetch.mockResolvedValue(mockModelsResponse);

      const connectionResult = await searchTool.testConnection();
      expect(connectionResult).toBe(true);
    });

    it('should handle connection test failures', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      const connectionResult = await searchTool.testConnection();
      expect(connectionResult).toBe(false);
    }, 10000);
  });

  describe('Performance Testing', () => {
    it('should complete search within reasonable time', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'perf-test',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'perplexity/sonar',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Quick response for performance testing.',
              },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        }),
      };

      // Simulate a realistic network delay
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve(mockResponse), 500))
      );

      const startTime = Date.now();
      const result = await searchTool.search({ query: 'performance test' });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(400); // At least the simulated delay
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.result?.metadata.responseTime).toBeGreaterThan(400);
    });
  });

  describe('Deep Research Modes Integration', () => {
    it('should complete end-to-end search with default model (sonar)', async () => {
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-default-model',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'perplexity/sonar',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content:
                  'Quick answer about TypeScript features.\n\nSources:\nhttps://www.typescriptlang.org/docs',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 25,
            total_tokens: 35,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockApiResponse);

      // Call without specifying model - should use default 'sonar'
      const result = await searchTool.search({
        query: 'TypeScript features',
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      const searchResult = result.result!;

      // Verify model defaults to sonar
      expect(searchResult.metadata.model).toBe('perplexity/sonar');

      // Verify timeout is set (should be 30000ms for sonar)
      expect(searchResult.metadata.timeout).toBe(30000);

      // Verify costTier is standard for default model
      expect(searchResult.metadata.costTier).toBe('standard');

      // Verify API call used correct model identifier
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"model":"perplexity/sonar"'),
        })
      );
    });

    it('should complete end-to-end search with premium model (sonar-pro)', async () => {
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-premium-model',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'perplexity/sonar-pro',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content:
                  'Detailed multi-step analysis of machine learning algorithms.\n\nSources:\nhttps://arxiv.org/ml-papers',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 80,
            total_tokens: 95,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockApiResponse);

      const result = await searchTool.search({
        query: 'machine learning algorithms comparison',
        model: 'sonar-pro',
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      const searchResult = result.result!;

      // Verify model is mapped correctly to full OpenRouter identifier
      expect(searchResult.metadata.model).toBe('perplexity/sonar-pro');

      // Verify timeout is set for sonar-pro (60000ms)
      expect(searchResult.metadata.timeout).toBe(60000);

      // Verify costTier is premium for sonar-pro
      expect(searchResult.metadata.costTier).toBe('premium');

      // Verify API call used correct model identifier
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"model":"perplexity/sonar-pro"'),
        })
      );
    });

    it('should complete end-to-end search with timeout override', async () => {
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          id: 'chatcmpl-timeout-override',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'perplexity/sonar-deep-research',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content:
                  'Comprehensive research report on quantum computing.\n\nSources:\nhttps://quantum.research.org',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 200,
            total_tokens: 220,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockApiResponse);

      const customTimeout = 450000; // 7.5 minutes

      const result = await searchTool.search({
        query: 'comprehensive quantum computing research',
        model: 'sonar-deep-research',
        timeout: customTimeout,
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();

      const searchResult = result.result!;

      // Verify model is mapped correctly
      expect(searchResult.metadata.model).toBe(
        'perplexity/sonar-deep-research'
      );

      // Verify timeout override is applied instead of model default (300000ms)
      expect(searchResult.metadata.timeout).toBe(customTimeout);

      // Verify costTier is premium for deep research
      expect(searchResult.metadata.costTier).toBe('premium');
    });
  });
});
