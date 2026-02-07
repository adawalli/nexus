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

import { SearchTool } from '../../../src/tools/search';
import {
  MODELS,
  MODEL_TIMEOUTS,
  MODEL_COST_TIERS,
} from '../../../src/constants/models';
import {
  setupSearchToolTest,
  type MockOpenRouterClient,
} from '../../utils/test-helpers.js';

describe('SearchTool Deep Research Modes', () => {
  let searchTool: SearchTool;
  let mockClient: MockOpenRouterClient;

  beforeEach(async () => {
    const setup = await setupSearchToolTest(TEST_API_KEY);
    searchTool = setup.searchTool;
    mockClient = setup.mockClient;
  });

  describe('Model name to OpenRouter identifier mapping', () => {
    it('should map "sonar" to "perplexity/sonar" in API request', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar')
      );

      await searchTool.search({ query: 'test query', model: 'sonar' });

      expect(mockClient.chatCompletions).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODELS.sonar,
        })
      );
    });

    it('should map "sonar-pro" to "perplexity/sonar-pro" in API request', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-pro')
      );

      await searchTool.search({ query: 'test query', model: 'sonar-pro' });

      expect(mockClient.chatCompletions).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODELS['sonar-pro'],
        })
      );
    });

    it('should map "sonar-reasoning-pro" to "perplexity/sonar-reasoning-pro" in API request', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-reasoning-pro')
      );

      await searchTool.search({
        query: 'test query',
        model: 'sonar-reasoning-pro',
      });

      expect(mockClient.chatCompletions).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODELS['sonar-reasoning-pro'],
        })
      );
    });

    it('should map "sonar-deep-research" to "perplexity/sonar-deep-research" in API request', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-deep-research')
      );

      await searchTool.search({
        query: 'test query',
        model: 'sonar-deep-research',
      });

      expect(mockClient.chatCompletions).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODELS['sonar-deep-research'],
        })
      );
    });
  });

  describe('Model-specific default timeouts', () => {
    it('should apply model-specific default timeout for sonar (30s)', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(MODEL_TIMEOUTS.sonar);
    });

    it('should apply model-specific default timeout for sonar-pro (60s)', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-pro')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-pro',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(MODEL_TIMEOUTS['sonar-pro']);
    });

    it('should apply model-specific default timeout for sonar-reasoning-pro (120s)', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-reasoning-pro')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-reasoning-pro',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(
        MODEL_TIMEOUTS['sonar-reasoning-pro']
      );
    });

    it('should apply model-specific default timeout for sonar-deep-research (300s)', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-deep-research')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-deep-research',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(
        MODEL_TIMEOUTS['sonar-deep-research']
      );
    });
  });

  describe('Timeout override parameter', () => {
    it('should respect timeout override parameter instead of model default', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar')
      );

      const customTimeout = 45000;
      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar',
        timeout: customTimeout,
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(customTimeout);
    });

    it('should allow timeout override for deep research model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-deep-research')
      );

      const customTimeout = 500000;
      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-deep-research',
        timeout: customTimeout,
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(customTimeout);
    });
  });

  describe('Cost tier in response metadata', () => {
    it('should include costTier "standard" for sonar model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.costTier).toBe(MODEL_COST_TIERS.sonar);
    });

    it('should include costTier "premium" for sonar-pro model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-pro')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-pro',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.costTier).toBe(
        MODEL_COST_TIERS['sonar-pro']
      );
    });

    it('should include costTier "premium" for sonar-reasoning-pro model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-reasoning-pro')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-reasoning-pro',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.costTier).toBe(
        MODEL_COST_TIERS['sonar-reasoning-pro']
      );
    });

    it('should include costTier "premium" for sonar-deep-research model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-deep-research')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-deep-research',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.costTier).toBe(
        MODEL_COST_TIERS['sonar-deep-research']
      );
    });
  });

  describe('Response metadata fields', () => {
    it('should include model field in response metadata showing OpenRouter identifier', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-pro')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-pro',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.model).toBe('perplexity/sonar-pro');
    });

    it('should include timeout field in response metadata', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBeDefined();
      expect(typeof result.result?.metadata.timeout).toBe('number');
    });

    it('should include costTier field in response metadata', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar-pro')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar-pro',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.costTier).toBeDefined();
      expect(['standard', 'premium']).toContain(
        result.result?.metadata.costTier
      );
    });
  });
});
