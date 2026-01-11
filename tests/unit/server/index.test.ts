import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = { ...process.env };

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  withCorrelationId: vi.fn((id, callback) => callback()),
  generateCorrelationId: vi.fn().mockReturnValue('test-correlation-id'),
}));

vi.mock('../../../src/utils/mcp-error-handler.js', () => ({
  MCPErrorHandler: {
    createSafeResponse: vi.fn().mockReturnValue({
      content: [{ type: 'text', text: 'Error occurred' }],
      isError: true,
    }),
  },
  withMCPErrorHandling: vi.fn((name, handler) => handler),
}));

vi.mock('../../../src/utils/stdio-handler.js', () => ({
  stdioHandler: {
    flush: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn().mockResolvedValue(undefined),
    getMetrics: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('../../../src/config/index.js', () => ({
  ConfigurationManager: {
    getInstance: vi.fn().mockReturnValue({
      getLogLevel: vi.fn().mockReturnValue('info'),
      getApiKey: vi.fn().mockReturnValue('sk-or-v1-test-api-key-12345'),
      getMaskedApiKey: vi.fn().mockReturnValue('sk-or-***'),
      getDefaultModel: vi.fn().mockReturnValue('perplexity/sonar'),
      getTimeoutMs: vi.fn().mockReturnValue(30000),
      getSafeConfig: vi
        .fn()
        .mockReturnValue({ apiKey: '***', model: 'perplexity/sonar' }),
    }),
    reset: vi.fn(),
  },
  ConfigurationError: class ConfigurationError extends Error {
    errors: string[];
    warnings: string[];
    constructor(
      message: string,
      errors: string[] = [],
      warnings: string[] = []
    ) {
      super(message);
      this.name = 'ConfigurationError';
      this.errors = errors;
      this.warnings = warnings;
    }
  },
}));

vi.mock('../../../src/tools/search.js', () => ({
  createSearchTool: vi.fn().mockReturnValue({
    search: vi.fn().mockResolvedValue({
      success: true,
      requestId: 'test-req-id',
      result: {
        content: 'Test search result',
        sources: [{ url: 'https://example.com', title: 'Example' }],
        metadata: {
          model: 'perplexity/sonar',
          responseTime: 100,
          usage: { total_tokens: 50 },
        },
      },
    }),
  }),
}));

vi.mock('../../../src/types/search.js', () => ({
  validateSearchResponse: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../src/utils/json-validator.js', () => ({
  JSONValidator: {
    safeStringify: vi.fn().mockReturnValue({ success: true, data: '{}' }),
    wrapMCPResponse: vi.fn(data => ({
      jsonrpc: '2.0',
      id: 'test-id',
      result: data,
    })),
  },
  safeStringify: vi.fn().mockReturnValue('{}'),
}));

vi.mock('../../../src/schemas/search.js', () => ({
  validateSearchInput: vi.fn(),
}));

vi.mock('../../../src/utils/zod-error-parser.js', () => ({
  createUserFriendlyMessage: vi
    .fn()
    .mockReturnValue({ message: 'Validation error' }),
}));

describe('MCP Server Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-api-key-12345-valid';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  describe('createServer', () => {
    it('should create and start the server', async () => {
      const { createServer } = await import('../../../src/index.js');
      const { Server } =
        await import('@modelcontextprotocol/sdk/server/index.js');

      const result = await createServer();

      expect(Server).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should initialize configuration', async () => {
      const { createServer } = await import('../../../src/index.js');
      const { ConfigurationManager } =
        await import('../../../src/config/index.js');

      await createServer();

      expect(ConfigurationManager.getInstance).toHaveBeenCalled();
    });

    it('should create search tool with API key', async () => {
      const { createServer } = await import('../../../src/index.js');
      const { createSearchTool } = await import('../../../src/tools/search.js');

      await createServer();

      expect(createSearchTool).toHaveBeenCalled();
    });

    it('should connect to transport', async () => {
      const { createServer } = await import('../../../src/index.js');

      const server = await createServer();

      expect(server).toBeDefined();
    });
  });
});
