import { describe, it, expect } from 'bun:test';

import { testHelpers } from '../utils';

describe('Sample Unit Test', () => {
  it('should verify test setup works', () => {
    expect(true).toBe(true);
  });

  it('should have access to test helpers', () => {
    expect(testHelpers).toBeDefined();
    expect(typeof testHelpers.wait).toBe('function');
  });
});
