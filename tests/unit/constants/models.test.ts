import { describe, it, expect } from 'bun:test';

import {
  MODELS,
  MODEL_TIMEOUTS,
  MODEL_COST_TIERS,
  MODEL_SEARCH_TYPES,
  type UserFriendlyModelName,
} from '../../../src/constants/models';

describe('Model Constants', () => {
  describe('MODELS', () => {
    it('should map user-friendly model names to valid OpenRouter identifiers', () => {
      expect(MODELS.sonar).toBe('perplexity/sonar');
      expect(MODELS['sonar-pro']).toBe('perplexity/sonar-pro');
      expect(MODELS['sonar-reasoning-pro']).toBe(
        'perplexity/sonar-reasoning-pro'
      );
      expect(MODELS['sonar-deep-research']).toBe(
        'perplexity/sonar-deep-research'
      );
      expect(MODELS['grok-4']).toBe('x-ai/grok-4');
    });

    it('should contain exactly five model mappings', () => {
      expect(Object.keys(MODELS)).toHaveLength(5);
    });
  });

  describe('MODEL_TIMEOUTS', () => {
    it('should map models to their correct default timeouts', () => {
      expect(MODEL_TIMEOUTS.sonar).toBe(30000);
      expect(MODEL_TIMEOUTS['sonar-pro']).toBe(60000);
      expect(MODEL_TIMEOUTS['sonar-reasoning-pro']).toBe(120000);
      expect(MODEL_TIMEOUTS['sonar-deep-research']).toBe(300000);
      expect(MODEL_TIMEOUTS['grok-4']).toBe(60000);
    });

    it('should have all timeouts within valid bounds (5000ms min, 600000ms max)', () => {
      const timeoutValues = Object.values(MODEL_TIMEOUTS);

      for (const timeout of timeoutValues) {
        expect(timeout).toBeGreaterThanOrEqual(5000);
        expect(timeout).toBeLessThanOrEqual(600000);
      }
    });
  });

  describe('MODEL_COST_TIERS', () => {
    it('should classify models into correct cost tiers', () => {
      expect(MODEL_COST_TIERS.sonar).toBe('standard');
      expect(MODEL_COST_TIERS['sonar-pro']).toBe('premium');
      expect(MODEL_COST_TIERS['sonar-reasoning-pro']).toBe('premium');
      expect(MODEL_COST_TIERS['sonar-deep-research']).toBe('premium');
      expect(MODEL_COST_TIERS['grok-4']).toBe('premium');
    });
  });

  describe('MODEL_SEARCH_TYPES', () => {
    it('should classify Perplexity models as realtime search', () => {
      expect(MODEL_SEARCH_TYPES.sonar).toBe('realtime');
      expect(MODEL_SEARCH_TYPES['sonar-pro']).toBe('realtime');
      expect(MODEL_SEARCH_TYPES['sonar-reasoning-pro']).toBe('realtime');
      expect(MODEL_SEARCH_TYPES['sonar-deep-research']).toBe('realtime');
    });

    it('should classify Grok 4 as training-data based search', () => {
      expect(MODEL_SEARCH_TYPES['grok-4']).toBe('training-data');
    });

    it('should have entries for all models', () => {
      const modelNames = Object.keys(MODELS);
      const searchTypeNames = Object.keys(MODEL_SEARCH_TYPES);
      expect(searchTypeNames.sort()).toEqual(modelNames.sort());
    });
  });

  describe('UserFriendlyModelName type', () => {
    it('should accept valid model names including grok-4 at type level', () => {
      const validNames: UserFriendlyModelName[] = [
        'sonar',
        'sonar-pro',
        'sonar-reasoning-pro',
        'sonar-deep-research',
        'grok-4',
      ];

      expect(validNames).toHaveLength(5);
    });
  });
});
