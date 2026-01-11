import { z } from 'zod';

import {
  PERPLEXITY_MODELS,
  MIN_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  type UserFriendlyModelName,
} from '../constants/models.js';

/**
 * Valid model names derived from the constants
 */
const VALID_MODELS = Object.keys(PERPLEXITY_MODELS) as [
  UserFriendlyModelName,
  ...UserFriendlyModelName[],
];

/**
 * Supported Perplexity models for search operations (user-friendly names)
 * Exported for backward compatibility with tests
 */
export const SUPPORTED_MODELS: UserFriendlyModelName[] = [...VALID_MODELS];

/**
 * Model schema with custom error messages
 */
const modelSchema = z
  .enum(VALID_MODELS, {
    error: ((val: { input: unknown }) =>
      `Invalid model '${val.input}'. Valid options: ${VALID_MODELS.join(', ')}`) as unknown as string,
  })
  .default('sonar')
  .describe(
    'Perplexity model to use for search. Options: sonar (fast Q&A, default), sonar-pro (multi-step queries), sonar-reasoning-pro (chain-of-thought reasoning), sonar-deep-research (exhaustive research reports)'
  );

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
  model: modelSchema,

  /**
   * Timeout override in milliseconds (optional)
   */
  timeout: z
    .number()
    .int()
    .min(
      MIN_TIMEOUT_MS,
      `Timeout must be at least ${MIN_TIMEOUT_MS}ms (5 seconds)`
    )
    .max(
      MAX_TIMEOUT_MS,
      `Timeout cannot exceed ${MAX_TIMEOUT_MS}ms (10 minutes)`
    )
    .optional()
    .describe(
      `Optional timeout override in milliseconds. Overrides the model's default timeout. Min: ${MIN_TIMEOUT_MS}ms, Max: ${MAX_TIMEOUT_MS}ms`
    ),

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
