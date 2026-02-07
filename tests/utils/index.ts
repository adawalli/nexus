export * from './test-helpers.js';
export * from './mocks.js';

// Backward-compatible grouped export for legacy consumers
import { wait } from './test-helpers.js';
import { createMockFunction } from './mocks.js';

export const testHelpers = {
  wait,
  createMockFunction,
};
