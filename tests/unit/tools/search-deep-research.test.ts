import { describe, it, expect, beforeEach, vi, type MockedClass } from 'vitest';

import { SearchTool } from '../../../src/tools/search';
import type { ChatCompletionResponse } from '../../../src/types/openrouter';
import {
  PERPLEXITY_MODELS,
  MODEL_TIMEOUTS,
  MODEL_COST_TIERS,
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

describe('SearchTool Deep Research Modes', () => {
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
          content: 'This is a test response with source https://example.com',
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

  describe('Model name to OpenRouter identifier mapping', () => {
    it('should map "sonar" to "perplexity/sonar" in API request', async () => {
      mockClient.chatCompletions.mockResolvedValue(
        createMockApiResponse('perplexity/sonar')
      );

      await searchTool.search({ query: 'test query', model: 'sonar' });

      expect(mockClient.chatCompletions).toHaveBeenCalledWith(
        expect.objectContaining({
          model: PERPLEXITY_MODELS.sonar,
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
          model: PERPLEXITY_MODELS['sonar-pro'],
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
          model: PERPLEXITY_MODELS['sonar-reasoning-pro'],
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
          model: PERPLEXITY_MODELS['sonar-deep-research'],
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
