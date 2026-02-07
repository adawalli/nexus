import { mock } from 'bun:test';

import { SearchTool } from '../../src/tools/search.js';

/**
 * Common test utilities and helpers.
 */

/**
 * Wait for a specified number of milliseconds.
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => globalThis.setTimeout(resolve, ms));
}

/**
 * Type for the mock OpenRouter client instance extracted from a mocked module.
 */
export type MockOpenRouterClient = {
  chatCompletions: ReturnType<typeof mock>;
  testConnection: ReturnType<typeof mock>;
  getHeaders: ReturnType<typeof mock>;
};

/**
 * Standard beforeEach setup for SearchTool test suites that mock the OpenRouter client.
 * Resets the ConfigurationManager singleton, creates a fresh SearchTool, and extracts
 * the mock client instance from the mocked OpenRouterClient constructor.
 *
 * Returns the searchTool and mockClient for use in tests.
 */
export async function setupSearchToolTest(apiKey: string): Promise<{
  searchTool: SearchTool;
  mockClient: MockOpenRouterClient;
}> {
  process.env.OPENROUTER_API_KEY = apiKey;

  const { ConfigurationManager } = await import('../../src/config/manager.js');
  ConfigurationManager['instance'] = null;

  const searchTool = new SearchTool(apiKey);

  const openRouterModule = await import('../../src/clients/openrouter.js');
  const MockClient = openRouterModule.OpenRouterClient as unknown as {
    mock: { results: Array<{ value: MockOpenRouterClient }> };
  };
  const mockClient =
    MockClient.mock.results[MockClient.mock.results.length - 1].value;

  mockClient.chatCompletions.mockClear();
  mockClient.testConnection.mockClear();
  mockClient.getHeaders.mockClear();

  return { searchTool, mockClient };
}

/**
 * Lighter setup for integration tests that mock global fetch instead of the client.
 * Resets the ConfigurationManager singleton and creates a fresh SearchTool.
 */
export async function setupIntegrationSearchTest(
  apiKey: string
): Promise<SearchTool> {
  process.env.OPENROUTER_API_KEY = apiKey;

  const { ConfigurationManager } = await import('../../src/config/manager.js');
  ConfigurationManager['instance'] = null;

  return new SearchTool(apiKey);
}
