import { describe, it, expect } from 'vitest';

import {
  PERPLEXITY_MODELS,
  MODEL_TIMEOUTS,
  MODEL_COST_TIERS,
  type UserFriendlyModelName,
} from '../../../src/constants/models';

describe('Model Constants', () => {
  describe('PERPLEXITY_MODELS', () => {
    it('should map all four user-friendly model names to valid OpenRouter identifiers', () => {
      expect(PERPLEXITY_MODELS.sonar).toBe('perplexity/sonar');
      expect(PERPLEXITY_MODELS['sonar-pro']).toBe('perplexity/sonar-pro');
      expect(PERPLEXITY_MODELS['sonar-reasoning-pro']).toBe(
        'perplexity/sonar-reasoning-pro'
      );
      expect(PERPLEXITY_MODELS['sonar-deep-research']).toBe(
        'perplexity/sonar-deep-research'
      );
    });

    it('should contain exactly four model mappings', () => {
      expect(Object.keys(PERPLEXITY_MODELS)).toHaveLength(4);
    });
  });

  describe('MODEL_TIMEOUTS', () => {
    it('should map models to their correct default timeouts', () => {
      expect(MODEL_TIMEOUTS.sonar).toBe(30000);
      expect(MODEL_TIMEOUTS['sonar-pro']).toBe(60000);
      expect(MODEL_TIMEOUTS['sonar-reasoning-pro']).toBe(120000);
      expect(MODEL_TIMEOUTS['sonar-deep-research']).toBe(300000);
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
    it('should classify sonar as standard tier', () => {
      expect(MODEL_COST_TIERS.sonar).toBe('standard');
    });

    it('should classify premium models correctly', () => {
      expect(MODEL_COST_TIERS['sonar-pro']).toBe('premium');
      expect(MODEL_COST_TIERS['sonar-reasoning-pro']).toBe('premium');
      expect(MODEL_COST_TIERS['sonar-deep-research']).toBe('premium');
    });
  });

  describe('UserFriendlyModelName type', () => {
    it('should accept valid model names at type level', () => {
      const validNames: UserFriendlyModelName[] = [
        'sonar',
        'sonar-pro',
        'sonar-reasoning-pro',
        'sonar-deep-research',
      ];

      expect(validNames).toHaveLength(4);
    });
  });
});
