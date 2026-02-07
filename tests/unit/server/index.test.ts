import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

const originalEnv = { ...process.env };

mock.module('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: mock(() => ({
    setRequestHandler: mock(() => {}),
    connect: mock(() => Promise.resolve(undefined)),
  })),
}));

mock.module('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: mock(() => ({})),
}));

mock.module('dotenv', () => ({
  default: { config: mock(() => {}) },
}));

mock.module('../../../src/utils/logger.js', () => ({
  logger: {
    info: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
    debug: mock(() => {}),
  },
  withCorrelationId: mock((id, callback) => callback()),
  generateCorrelationId: mock(() => 'test-correlation-id'),
}));

mock.module('../../../src/utils/mcp-error-handler.js', () => ({
  MCPErrorHandler: {
    createSafeResponse: mock(() => ({
      content: [{ type: 'text', text: 'Error occurred' }],
      isError: true,
    })),
  },
  withMCPErrorHandling: mock((name, handler) => handler),
}));

mock.module('../../../src/utils/stdio-handler.js', () => ({
  stdioHandler: {
    flush: mock(() => Promise.resolve(undefined)),
    cleanup: mock(() => Promise.resolve(undefined)),
    getMetrics: mock(() => ({})),
  },
}));

mock.module('../../../src/config/index.js', () => ({
  ConfigurationManager: {
    getInstance: mock(() => ({
      getLogLevel: mock(() => 'info'),
      getApiKey: mock(() => 'sk-or-v1-test-api-key-12345'),
      getMaskedApiKey: mock(() => 'sk-or-***'),
      getDefaultModel: mock(() => 'perplexity/sonar'),
      getTimeoutMs: mock(() => 30000),
      getSafeConfig: mock(() => ({ apiKey: '***', model: 'perplexity/sonar' })),
    })),
    reset: mock(() => {}),
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

mock.module('../../../src/tools/search.js', () => ({
  createSearchTool: mock(() => ({
    search: mock(() =>
      Promise.resolve({
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
      })
    ),
  })),
}));

mock.module('../../../src/types/search.js', () => ({
  validateSearchResponse: mock(() => true),
}));

mock.module('../../../src/utils/json-validator.js', () => ({
  JSONValidator: {
    safeStringify: mock(() => ({ success: true, data: '{}' })),
    wrapMCPResponse: mock(data => ({
      jsonrpc: '2.0',
      id: 'test-id',
      result: data,
    })),
  },
  safeStringify: mock(() => '{}'),
}));

mock.module('../../../src/schemas/search.js', () => ({
  validateSearchInput: mock(() => {}),
}));

mock.module('../../../src/utils/zod-error-parser.js', () => ({
  createUserFriendlyMessage: mock(() => ({ message: 'Validation error' })),
}));

describe('MCP Server Index', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-api-key-12345-valid';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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
