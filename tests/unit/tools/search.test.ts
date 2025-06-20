import { describe, it, expect, beforeEach, vi, type MockedClass } from 'vitest';

import {
  SearchTool,
  createSearchTool,
  performSearch,
} from '../../../src/tools/search';
import type { ChatCompletionResponse } from '../../../src/types/openrouter';

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

// Mock winston to avoid console output during tests
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

describe('SearchTool', () => {
  const mockApiKey = 'sk-or-test-api-key';
  let searchTool: SearchTool;
  let mockClient: {
    chatCompletions: ReturnType<typeof vi.fn>;
    testConnection: ReturnType<typeof vi.fn>;
    getHeaders: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    searchTool = new SearchTool(mockApiKey);

    // Get the mock client instance
    const openRouterModule = await import('../../../src/clients/openrouter');
    const MockClient =
      openRouterModule.OpenRouterClient as unknown as MockedClass<
        typeof openRouterModule.OpenRouterClient
      >;
    mockClient =
      MockClient.mock.results[MockClient.mock.results.length - 1].value;
  });

  describe('constructor', () => {
    it('should create SearchTool with API key', () => {
      expect(searchTool).toBeInstanceOf(SearchTool);
    });

    it('should initialize OpenRouter client with correct config', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      const MockClient =
        openRouterModule.OpenRouterClient as unknown as MockedClass<
          typeof openRouterModule.OpenRouterClient
        >;
      expect(MockClient).toHaveBeenCalledWith({
        apiKey: mockApiKey,
        userAgent: 'openrouter-search-mcp/1.0.0',
        timeout: 30000,
        maxRetries: 3,
      });
    });
  });

  describe('search', () => {
    const mockApiResponse: ChatCompletionResponse = {
      id: 'test-123',
      object: 'chat.completion',
      created: 1640995200,
      model: 'perplexity/llama-3.1-sonar-small-128k-online',
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
    };

    it('should perform successful search with valid input', async () => {
      mockClient.chatCompletions.mockResolvedValue(mockApiResponse);

      const input = {
        query: 'test query',
        model: 'perplexity/llama-3.1-sonar-small-128k-online' as const,
        maxTokens: 1000,
        temperature: 0.7,
      };

      const result = await searchTool.search(input);

      expect(result.success).toBe(true);
      expect(result.result?.content).toBe(
        'This is a test response with source https://example.com'
      );
      expect(result.result?.metadata.query).toBe('test query');
      expect(result.result?.metadata.model).toBe(
        'perplexity/llama-3.1-sonar-small-128k-online'
      );
      expect(result.requestId).toBe('test-123');
    });

    it('should apply defaults for optional parameters', async () => {
      mockClient.chatCompletions.mockResolvedValue(mockApiResponse);

      const input = { query: 'test query' };
      await searchTool.search(input);

      expect(mockClient.chatCompletions).toHaveBeenCalledWith({
        model: 'perplexity/llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: 'test query' }],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      });
    });

    it('should handle validation errors', async () => {
      const input = { query: '' }; // Invalid empty query

      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('Query cannot be empty');
    });

    it('should handle authentication errors', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      mockClient.chatCompletions.mockRejectedValue(
        new openRouterModule.AuthenticationError('Invalid API key')
      );

      const input = { query: 'test query' };
      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('auth');
      expect(result.error).toBe('Authentication failed: Invalid API key');
    });

    it('should handle rate limit errors', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      mockClient.chatCompletions.mockRejectedValue(
        new openRouterModule.RateLimitError('Rate limited', 60)
      );

      const input = { query: 'test query' };
      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.error).toBe('Rate limit exceeded (retry after 60s)');
    });

    it('should handle server errors', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      mockClient.chatCompletions.mockRejectedValue(
        new openRouterModule.ServerError('Internal server error', 500, 500)
      );

      const input = { query: 'test query' };
      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('api');
      expect(result.error).toBe('OpenRouter service temporarily unavailable');
    });

    it('should handle timeout errors', async () => {
      mockClient.chatCompletions.mockRejectedValue(
        new Error('Request timeout after 30000ms')
      );

      const input = { query: 'test query' };
      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
      expect(result.error).toBe('Request timed out - please try again');
    });

    it('should handle network errors', async () => {
      mockClient.chatCompletions.mockRejectedValue(
        new Error('Network error: Connection failed')
      );

      const input = { query: 'test query' };
      const result = await searchTool.search(input);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toBe('Network error - please check your connection');
    });

    it('should handle unknown errors', async () => {
      mockClient.chatCompletions.mockRejectedValue(new Error('Unknown error'));

      const input = { query: 'test query' };
      const result = await searchTool.search(input);

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

      const input = { query: 'test query' };
      const result = await searchTool.search(input);

      expect(result.success).toBe(true);
      expect(result.result?.metadata.responseTime).toBeGreaterThan(90);
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
});

describe('Factory Functions', () => {
  describe('createSearchTool', () => {
    it('should create SearchTool instance', () => {
      const searchTool = createSearchTool('test-api-key');
      expect(searchTool).toBeInstanceOf(SearchTool);
    });
  });

  describe('performSearch', () => {
    it('should perform search with factory function', async () => {
      const openRouterModule = await import('../../../src/clients/openrouter');
      const MockClient =
        openRouterModule.OpenRouterClient as unknown as MockedClass<
          typeof openRouterModule.OpenRouterClient
        >;
      const mockClient =
        MockClient.mock.results[MockClient.mock.results.length - 1].value;

      const mockResponse: ChatCompletionResponse = {
        id: 'test-123',
        object: 'chat.completion',
        created: 1640995200,
        model: 'perplexity/llama-3.1-sonar-small-128k-online',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Test response',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      mockClient.chatCompletions.mockResolvedValue(mockResponse);

      const result = await performSearch('test query', 'test-api-key', {
        temperature: 0.5,
      });

      expect(result.success).toBe(true);
      expect(result.result?.content).toBe('Test response');
      expect(result.result?.metadata.temperature).toBe(0.5);
    });
  });
});
