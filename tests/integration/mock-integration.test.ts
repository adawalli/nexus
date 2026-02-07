import { describe, it, expect } from 'bun:test';

import { mockOpenRouterModel, mockMcpRequest, testHelpers } from '../utils';

describe('Mock Integration Tests', () => {
  it('should create OpenRouter model mocks', () => {
    const model = mockOpenRouterModel();

    expect(model).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      context_length: expect.any(Number),
      pricing: {
        prompt: expect.any(String),
        completion: expect.any(String),
      },
    });
  });

  it('should create MCP request mocks', () => {
    const request = mockMcpRequest();

    expect(request).toMatchObject({
      jsonrpc: '2.0',
      id: expect.any(Number),
      method: expect.any(String),
      params: expect.any(Object),
    });
  });

  it('should have working test helpers', async () => {
    const mockFn = testHelpers.createMockFunction(() => 'test result');

    expect(mockFn()).toBe('test result');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
