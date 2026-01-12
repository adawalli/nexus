import { describe, it, expect, beforeEach, vi, type MockedClass } from 'vitest';

import { SearchTool } from '../../../src/tools/search';
import type { ChatCompletionResponse } from '../../../src/types/openrouter';
import {
  MODELS,
  MODEL_TIMEOUTS,
  MODEL_COST_TIERS,
  MODEL_SEARCH_TYPES,
} from '../../../src/constants/models';

// Mock the OpenRouter client
vi.mock('../../../src/clients/openrouter', () => {
  const mockClient = {
    chatCompletions: vi.fn(),
    testConnection: vi.fn(),
    getHeaders: vi.fn(),
  };

  return {
    OpenRouterClient: vi.fn(() => mockClient),
    OpenRouterApiError: class extends Error {
      constructor(
        message: string,
        public statusCode: number,
        public type: string,
        public code: number
      ) {
        super(message);
      }
    },
    AuthenticationError: class extends Error {
      constructor(
        message: string,
        public statusCode: number = 401,
        public code: number = 401
      ) {
        super(message);
      }
    },
    RateLimitError: class extends Error {
      constructor(
        message: string,
        public retryAfter?: number,
        public statusCode: number = 429,
        public code: number = 429
      ) {
        super(message);
        this.retryAfter = retryAfter;
      }
    },
    ServerError: class extends Error {
      constructor(
        message: string,
        public statusCode: number,
        public code: number
      ) {
        super(message);
      }
    },
  };
});

vi.mock('winston', () => ({
  default: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    format: {
      combine: vi.fn(() => ({})),
      timestamp: vi.fn(),
      errors: vi.fn(),
      json: vi.fn(),
      colorize: vi.fn(),
      simple: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
    },
  },
}));

describe('SearchTool Grok 4 Integration', () => {
  const mockApiKey = 'sk-or-test-api-key-12345678901234';
  let searchTool: SearchTool;
  let mockClient: {
    chatCompletions: ReturnType<typeof vi.fn>;
    testConnection: ReturnType<typeof vi.fn>;
    getHeaders: ReturnType<typeof vi.fn>;
  };

  const createMockApiResponse = (model: string): ChatCompletionResponse => ({
    id: 'test-123',
    object: 'chat.completion',
    created: 1640995200,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a test response from the model.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.OPENROUTER_API_KEY = mockApiKey;

    const { ConfigurationManager } =
      await import('../../../src/config/manager');
    ConfigurationManager['instance'] = null;

    searchTool = new SearchTool(mockApiKey);

    const openRouterModule = await import('../../../src/clients/openrouter');
    const MockClient =
      openRouterModule.OpenRouterClient as unknown as MockedClass<
        typeof openRouterModule.OpenRouterClient
      >;
    mockClient =
      MockClient.mock.results[MockClient.mock.results.length - 1].value;
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
