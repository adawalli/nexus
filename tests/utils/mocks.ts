import { mock } from 'bun:test';

/**
 * Create a mock OpenRouter model object for testing.
 */
export function mockOpenRouterModel(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 'perplexity/sonar',
    name: 'Sonar',
    description: 'A fast search model',
    context_length: 4096,
    pricing: {
      prompt: '0.001',
      completion: '0.001',
    },
    ...overrides,
  };
}

/**
 * Create a mock MCP JSON-RPC request for testing.
 */
export function mockMcpRequest(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search',
      arguments: { query: 'test query' },
    },
    ...overrides,
  };
}

/**
 * Create a mock function that can be used in tests.
 */
export function createMockFunction<T extends (...args: unknown[]) => unknown>(
  implementation?: T
): ReturnType<typeof mock> {
  return mock(implementation);
}
