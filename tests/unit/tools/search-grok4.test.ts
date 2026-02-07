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
  MODEL_SEARCH_TYPES,
} from '../../../src/constants/models';
import {
  setupSearchToolTest,
  type MockOpenRouterClient,
} from '../../utils/test-helpers.js';

describe('SearchTool Grok 4 Integration', () => {
  let searchTool: SearchTool;
  let mockClient: MockOpenRouterClient;

  beforeEach(async () => {
    const setup = await setupSearchToolTest(TEST_API_KEY);
    searchTool = setup.searchTool;
    mockClient = setup.mockClient;
  });

  describe('resolveModelIdentifier for Grok 4', () => {
    it('should resolve "grok-4" to "x-ai/grok-4" in API request', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('x-ai/grok-4')
      );

      await searchTool.search({ query: 'test query', model: 'grok-4' });

      expect(mockClient.chatCompletions).toHaveBeenCalledWith(
        expect.objectContaining({
          model: MODELS['grok-4'],
        })
      );
      expect(MODELS['grok-4']).toBe('x-ai/grok-4');
    });
  });

  describe('getEffectiveTimeout for Grok 4', () => {
    it('should apply 60000ms default timeout for grok-4 model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('x-ai/grok-4')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'grok-4',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.timeout).toBe(MODEL_TIMEOUTS['grok-4']);
      expect(MODEL_TIMEOUTS['grok-4']).toBe(60000);
    });
  });

  describe('getCostTier for Grok 4', () => {
    it('should return "premium" cost tier for grok-4 model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('x-ai/grok-4')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'grok-4',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.costTier).toBe(MODEL_COST_TIERS['grok-4']);
      expect(MODEL_COST_TIERS['grok-4']).toBe('premium');
    });
  });

  describe('searchType metadata field', () => {
    it('should include searchType "training-data" for Grok 4 model', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('x-ai/grok-4')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'grok-4',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.searchType).toBe(
        MODEL_SEARCH_TYPES['grok-4']
      );
      expect(MODEL_SEARCH_TYPES['grok-4']).toBe('training-data');
    });

    it('should include searchType "realtime" for Perplexity models', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar')
      );

      const result = await searchTool.search({
        query: 'test query',
        model: 'sonar',
      });

      expect(result.success).toBe(true);
      expect(result.result?.metadata.searchType).toBe(
        MODEL_SEARCH_TYPES['sonar']
      );
      expect(MODEL_SEARCH_TYPES['sonar']).toBe('realtime');
    });
  });
});
