import type { PerplexityModelId } from '../types/openrouter.js';

/**
 * User-friendly model names for the search tool parameter
 */
export type UserFriendlyModelName =
  | 'sonar'
  | 'sonar-pro'
  | 'sonar-reasoning-pro'
  | 'sonar-deep-research';

/**
 * Cost tier classification for models
 */
export type CostTier = 'standard' | 'premium';

/**
 * Maps user-friendly model names to full OpenRouter model identifiers
 */
export const PERPLEXITY_MODELS: Record<
  UserFriendlyModelName,
  PerplexityModelId
> = {
  sonar: 'perplexity/sonar',
  'sonar-pro': 'perplexity/sonar-pro',
  'sonar-reasoning-pro': 'perplexity/sonar-reasoning-pro',
  'sonar-deep-research': 'perplexity/sonar-deep-research',
} as const;

/**
 * Default timeouts for each model tier (in milliseconds)
 * - sonar: 30s for fast Q&A
 * - sonar-pro: 60s for multi-step queries
 * - sonar-reasoning-pro: 120s for chain-of-thought reasoning
 * - sonar-deep-research: 300s for exhaustive research
 */
export const MODEL_TIMEOUTS: Record<UserFriendlyModelName, number> = {
  sonar: 30000,
  'sonar-pro': 60000,
  'sonar-reasoning-pro': 120000,
  'sonar-deep-research': 300000,
} as const;

/**
 * Cost tier classification for billing awareness
 * - standard: default tier (sonar)
 * - premium: higher cost models (sonar-pro, sonar-reasoning-pro, sonar-deep-research)
 */
export const MODEL_COST_TIERS: Record<UserFriendlyModelName, CostTier> = {
  sonar: 'standard',
  'sonar-pro': 'premium',
  'sonar-reasoning-pro': 'premium',
  'sonar-deep-research': 'premium',
} as const;

/**
 * Minimum allowed timeout value in milliseconds
 */
export const MIN_TIMEOUT_MS = 5000;

/**
 * Maximum allowed timeout value in milliseconds (10 minutes)
 */
export const MAX_TIMEOUT_MS = 600000;
