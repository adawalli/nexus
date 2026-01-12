import type { ModelId } from '../types/openrouter.js';

/**
 * User-friendly model names for the search tool parameter
 */
export type UserFriendlyModelName =
  | 'sonar'
  | 'sonar-pro'
  | 'sonar-reasoning-pro'
  | 'sonar-deep-research'
  | 'grok-4';

/**
 * Cost tier classification for models
 */
export type CostTier = 'standard' | 'premium';

/**
 * Search type classification for understanding data source
 * - 'realtime': Data from real-time web search (Perplexity models)
 * - 'training-data': Data from model's training knowledge (Grok 4)
 */
export type SearchType = 'realtime' | 'training-data';

/**
 * Maps user-friendly model names to full OpenRouter model identifiers
 */
export const MODELS: Record<UserFriendlyModelName, ModelId> = {
  sonar: 'perplexity/sonar',
  'sonar-pro': 'perplexity/sonar-pro',
  'sonar-reasoning-pro': 'perplexity/sonar-reasoning-pro',
  'sonar-deep-research': 'perplexity/sonar-deep-research',
  'grok-4': 'x-ai/grok-4',
} as const;

/**
 * Default timeouts for each model tier (in milliseconds)
 * - sonar: 30s for fast Q&A
 * - sonar-pro: 60s for multi-step queries
 * - sonar-reasoning-pro: 120s for chain-of-thought reasoning
 * - sonar-deep-research: 300s for exhaustive research
 * - grok-4: 60s for training-data knowledge
 */
export const MODEL_TIMEOUTS: Record<UserFriendlyModelName, number> = {
  sonar: 30000,
  'sonar-pro': 60000,
  'sonar-reasoning-pro': 120000,
  'sonar-deep-research': 300000,
  'grok-4': 60000,
} as const;

/**
 * Cost tier classification for billing awareness
 * - standard: default tier (sonar)
 * - premium: higher cost models (sonar-pro, sonar-reasoning-pro, sonar-deep-research, grok-4)
 */
export const MODEL_COST_TIERS: Record<UserFriendlyModelName, CostTier> = {
  sonar: 'standard',
  'sonar-pro': 'premium',
  'sonar-reasoning-pro': 'premium',
  'sonar-deep-research': 'premium',
  'grok-4': 'premium',
} as const;

/**
 * Search type classification for understanding data source
 * - realtime: Perplexity models use real-time web search
 * - training-data: Grok 4 uses model's training knowledge
 */
export const MODEL_SEARCH_TYPES: Record<UserFriendlyModelName, SearchType> = {
  sonar: 'realtime',
  'sonar-pro': 'realtime',
  'sonar-reasoning-pro': 'realtime',
  'sonar-deep-research': 'realtime',
  'grok-4': 'training-data',
} as const;

/**
 * Minimum allowed timeout value in milliseconds
 */
export const MIN_TIMEOUT_MS = 5000;

/**
 * Maximum allowed timeout value in milliseconds (10 minutes)
 */
export const MAX_TIMEOUT_MS = 600000;
