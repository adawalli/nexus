import { mock } from 'bun:test';

import type { ChatCompletionResponse } from '../../src/types/openrouter.js';

/**
 * Shared test fixtures for mock API responses and test data.
 */

export const TEST_API_KEY = 'sk-or-test-api-key-12345678901234';

/**
 * Build a mock ChatCompletionResponse with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
export function createMockApiResponse(
  model: string,
  overrides: Partial<{
    id: string;
    content: string;
    usage: ChatCompletionResponse['usage'];
  }> = {}
): ChatCompletionResponse {
  return {
    id: overrides.id ?? 'test-123',
    object: 'chat.completion',
    created: 1640995200,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content:
            overrides.content ??
            'This is a test response with source https://example.com',
        },
        finish_reason: 'stop',
      },
    ],
    usage: overrides.usage ?? {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
}

/**
 * Build a mock fetch response object for integration tests that mock global fetch.
 * Returns an object shaped like a Response with ok: true and a json() method.
 */
export function createMockFetchResponse(
  model: string,
  overrides: Partial<{
    id: string;
    content: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> = {}
): { ok: true; json: () => Promise<Record<string, unknown>> } {
  return {
    ok: true,
    json: async () => ({
      id: overrides.id ?? 'chatcmpl-test',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              overrides.content ??
              'Test response.\n\nSources:\nhttps://example.com',
          },
          finish_reason: 'stop',
        },
      ],
      usage: overrides.usage ?? {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    }),
  };
}

/**
 * Build a mock fetch error response for integration tests.
 */
export function createMockFetchErrorResponse(
  status: number,
  error: { code: number; message: string; type: string }
): { ok: false; status: number; json: () => Promise<Record<string, unknown>> } {
  return {
    ok: false,
    status,
    json: async () => ({ error }),
  };
}

/**
 * The OpenRouter client mock definition, identical across all search tool test files.
 * Used with mock.module() - must be called at file top-level before imports.
 *
 * Usage:
 *   mock.module('../../../src/clients/openrouter', openRouterMockFactory);
 */
export function openRouterMockFactory(): Record<string, unknown> {
  const mockClient = {
    chatCompletions: mock(() => {}),
    testConnection: mock(() => {}),
    getHeaders: mock(() => {}),
  };

  class OpenRouterApiError extends Error {
    constructor(
      message: string,
      public statusCode: number,
      public type: string,
      public code: number
    ) {
      super(message);
    }
  }

  return {
    OpenRouterClient: mock(() => mockClient),
    OpenRouterApiError,
    AuthenticationError: class extends OpenRouterApiError {
      constructor(message: string, statusCode = 401, code = 401) {
        super(message, statusCode, 'authentication_error', code);
      }
    },
    RateLimitError: class extends OpenRouterApiError {
      retryAfter?: number;
      constructor(
        message: string,
        retryAfter?: number,
        statusCode = 429,
        code = 429
      ) {
        super(message, statusCode, 'rate_limit_error', code);
        this.retryAfter = retryAfter;
      }
    },
    ServerError: class extends OpenRouterApiError {
      constructor(message: string, statusCode: number, code: number) {
        super(message, statusCode, 'server_error', code);
      }
    },
  };
}

/**
 * Winston logger mock definition, shared across search tool test files.
 *
 * Usage:
 *   mock.module('winston', winstonMockFactory);
 */
export function winstonMockFactory(): Record<string, unknown> {
  return {
    default: {
      createLogger: () => ({
        debug: mock(() => {}),
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      }),
      format: {
        combine: mock(() => ({})),
        timestamp: mock(() => {}),
        errors: mock(() => {}),
        json: mock(() => {}),
        colorize: mock(() => {}),
        simple: mock(() => {}),
      },
      transports: {
        Console: mock(() => {}),
      },
    },
  };
}
