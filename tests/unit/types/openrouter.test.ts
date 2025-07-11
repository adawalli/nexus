import { describe, it, expect } from 'vitest';

import type {
  ChatMessage,
  ChatCompletionRequest,
  OpenRouterError,
  PerplexityModelId,
  ChatRole,
} from '../../../src/types/openrouter';

describe('OpenRouter Types', () => {
  describe('ChatMessage', () => {
    it('should accept valid chat message structure', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello, world!',
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, world!');
    });

    it('should accept optional name field', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello',
        name: 'test-user',
      };

      expect(message.name).toBe('test-user');
    });
  });

  describe('ChatCompletionRequest', () => {
    it('should accept minimal request structure', () => {
      const request: ChatCompletionRequest = {
        model: 'perplexity/sonar',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      expect(request.model).toBe('perplexity/sonar');
      expect(request.messages).toHaveLength(1);
    });

    it('should accept full request structure with optional fields', () => {
      const request: ChatCompletionRequest = {
        model: 'perplexity/sonar',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        stream: false,
        user: 'test-user',
      };

      expect(request.temperature).toBe(0.3);
      expect(request.max_tokens).toBe(1000);
      expect(request.stream).toBe(false);
    });
  });

  describe('ChatRole', () => {
    it('should accept valid role values', () => {
      const userRole: ChatRole = 'user';
      const assistantRole: ChatRole = 'assistant';
      const systemRole: ChatRole = 'system';

      expect(userRole).toBe('user');
      expect(assistantRole).toBe('assistant');
      expect(systemRole).toBe('system');
    });
  });

  describe('PerplexityModelId', () => {
    it('should accept valid Perplexity model IDs', () => {
      const model: PerplexityModelId = 'perplexity/sonar';

      expect(model).toBe('perplexity/sonar');
    });
  });

  describe('OpenRouterError', () => {
    it('should accept error structure', () => {
      const error: OpenRouterError = {
        error: {
          code: 429,
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
        },
      };

      expect(error.error.code).toBe(429);
      expect(error.error.type).toBe('rate_limit_error');
    });
  });
});
