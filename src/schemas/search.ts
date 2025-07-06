import { z } from 'zod';

import type { PerplexityModelId } from '../types/openrouter.js';

/**
 * Supported Perplexity models for search operations
 */
export const SUPPORTED_MODELS: PerplexityModelId[] = ['perplexity/sonar'];

/**
 * Zod schema for search tool input validation
 */
export const SearchToolInputSchema = z.object({
  /**
   * Search query string (required, non-empty)
   */
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(2000, 'Query too long (max 2000 characters)')
    .describe('The search query to process'),

  /**
   * Model selection (optional, defaults to sonar model)
   */
  model: z
    .enum(['perplexity/sonar'] as const)
    .default('perplexity/sonar')
    .describe('Perplexity model to use for search'),

  /**
   * Maximum tokens for response (optional, with reasonable bounds)
   */
  maxTokens: z
    .number()
    .int()
    .min(1, 'maxTokens must be at least 1')
    .max(4000, 'maxTokens cannot exceed 4000')
    .default(1000)
    .describe('Maximum number of tokens in the response'),

  /**
   * Temperature for response generation (optional, 0-2 range)
   */
  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(2, 'Temperature cannot exceed 2')
    .default(0.3)
    .describe(
      'Controls randomness in the response (0 = deterministic, 2 = very random)'
    ),

  /**
   * Top-p nucleus sampling parameter (optional, 0-1 range)
   */
  topP: z
    .number()
    .min(0, 'Top-p must be at least 0')
    .max(1, 'Top-p cannot exceed 1')
    .default(1.0)
    .describe(
      'Nucleus sampling cutoff probability (0.1 = only top 10% likely tokens)'
    ),

  /**
   * Frequency penalty to reduce repetition (optional, -2 to 2 range)
   */
  frequencyPenalty: z
    .number()
    .min(-2, 'Frequency penalty must be at least -2')
    .max(2, 'Frequency penalty cannot exceed 2')
    .default(0.0)
    .describe(
      'Penalty for repeated tokens based on frequency (-2 to 2, 0 = no penalty)'
    ),

  /**
   * Presence penalty to encourage topic diversity (optional, -2 to 2 range)
   */
  presencePenalty: z
    .number()
    .min(-2, 'Presence penalty must be at least -2')
    .max(2, 'Presence penalty cannot exceed 2')
    .default(0.0)
    .describe(
      'Penalty for tokens that already appear (-2 to 2, 0 = no penalty)'
    ),

  /**
   * Stop sequences to halt generation (optional)
   */
  stop: z
    .union([
      z.string().max(100, 'Stop sequence too long (max 100 characters)'),
      z
        .array(
          z.string().max(100, 'Stop sequence too long (max 100 characters)')
        )
        .max(4, 'Maximum 4 stop sequences'),
    ])
    .optional()
    .describe('String or array of strings where generation should stop'),
});

/**
 * TypeScript type for validated search tool input
 */
export type SearchToolInput = z.infer<typeof SearchToolInputSchema>;

/**
 * Validation function for search tool inputs
 */
export function validateSearchInput(input: unknown): SearchToolInput {
  return SearchToolInputSchema.parse(input);
}
