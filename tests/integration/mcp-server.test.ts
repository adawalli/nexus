import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import { JSONValidator } from '../../src/utils/json-validator.js';
import { JsonRpcValidator } from '../../src/utils/json-rpc-validator.js';
import { ConfigurationManager } from '../../src/config/manager.js';

describe('MCP Server JSON-RPC Response Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Mock environment variables for testing
    process.env.OPENROUTER_API_KEY =
      'sk-or-v1-test-key-that-is-long-enough-for-validation-12345';
    process.env.NODE_ENV = 'test';

    // Reset singleton instance
    ConfigurationManager.reset();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('list_tools response format', () => {
    it('should produce valid JSON-RPC 2.0 response for tools list', () => {
      // Arrange: Create the same response structure that the server creates
      const toolsResponse = {
        tools: [
          {
            name: 'search',
            description:
              'Nexus AI-powered search using Perplexity models via OpenRouter. Searches the web for current information and provides comprehensive answers with sources.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description:
                    'The search query to process (required, 1-2000 characters)',
                  minLength: 1,
                  maxLength: 2000,
                },
                model: {
                  type: 'string',
                  description:
                    'Perplexity model to use for search. Options: sonar (fast Q&A, 30s timeout), sonar-pro (multi-step queries, 60s timeout), sonar-reasoning-pro (chain-of-thought reasoning, 120s timeout), sonar-deep-research (exhaustive research reports, 300s timeout). Premium models (sonar-pro and above) have higher API costs.',
                  enum: [
                    'sonar',
                    'sonar-pro',
                    'sonar-reasoning-pro',
                    'sonar-deep-research',
                  ],
                  default: 'sonar',
                },
                maxTokens: {
                  type: 'number',
                  description:
                    'Maximum number of tokens in the response (1-4000)',
                  minimum: 1,
                  maximum: 4000,
                  default: 1000,
                },
                temperature: {
                  type: 'number',
                  description: 'Controls randomness in the response (0-2)',
                  minimum: 0,
                  maximum: 2,
                  default: 0.3,
                },
              },
              required: ['query'],
            },
          },
        ],
      };

      // Act: Process the response through the same validation that the server uses
      const wrappedResponse = JSONValidator.wrapMCPResponse(toolsResponse);

      // Assert: The response should be valid JSON-RPC 2.0
      expect(wrappedResponse).toBeDefined();
      expect(wrappedResponse.jsonrpc).toBe('2.0');
      expect('id' in wrappedResponse).toBe(true);

      // The response should either have 'result' or 'error', not both
      expect('result' in wrappedResponse !== 'error' in wrappedResponse).toBe(
        true
      );

      // CRITICAL: The response should contain the tools, not an error
      // This is the key assertion that will fail and demonstrate the bug
      expect('result' in wrappedResponse).toBe(true);
      expect('error' in wrappedResponse).toBe(false);

      // Validate using our JSON-RPC validator
      const validationResult =
        JsonRpcValidator.validateMessage(wrappedResponse);
      if (!validationResult.valid) {
        console.error('Validation errors:', validationResult.errors);
        console.error(
          'Actual response:',
          JSON.stringify(wrappedResponse, null, 2)
        );
      }
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Should contain tools array (this will fail because we get an error response)
      if (
        'result' in wrappedResponse &&
        wrappedResponse.result &&
        typeof wrappedResponse.result === 'object'
      ) {
        const result = wrappedResponse.result as any;
        expect(result.tools).toBeDefined();
        expect(Array.isArray(result.tools)).toBe(true);

        // Each tool should have required properties
        result.tools.forEach((tool: any) => {
          expect(tool.name).toBeDefined();
          expect(tool.description).toBeDefined();
          expect(tool.inputSchema).toBeDefined();
        });
      }
    });

    it('should handle empty tools list with valid JSON-RPC response', () => {
      // Arrange: Empty tools response
      const emptyToolsResponse = { tools: [] };

      // Act
      const wrappedResponse = JSONValidator.wrapMCPResponse(emptyToolsResponse);

      // Assert
      expect(wrappedResponse.jsonrpc).toBe('2.0');
      const validationResult =
        JsonRpcValidator.validateMessage(wrappedResponse);
      expect(validationResult.valid).toBe(true);

      if (
        'result' in wrappedResponse &&
        wrappedResponse.result &&
        typeof wrappedResponse.result === 'object'
      ) {
        const result = wrappedResponse.result as any;
        expect(result.tools).toEqual([]);
      }
    });

    it('should be serializable and parseable without corruption', () => {
      // Arrange
      const toolsResponse = {
        tools: [
          {
            name: 'search',
            description: 'Test tool',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
            },
          },
        ],
      };

      // Act
      const wrappedResponse = JSONValidator.wrapMCPResponse(toolsResponse);

      // Assert: Should be serializable without errors
      expect(() => JSON.stringify(wrappedResponse)).not.toThrow();

      // Should be parseable back to same structure
      const serialized = JSON.stringify(wrappedResponse);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(wrappedResponse);

      // Parsed version should still be valid JSON-RPC
      const reparsedValidation = JsonRpcValidator.validateMessage(parsed);
      expect(reparsedValidation.valid).toBe(true);
    });
  });
});
