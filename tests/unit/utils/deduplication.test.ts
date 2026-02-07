import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

import {
  RequestDeduplicator,
  createRequestKey,
  searchDeduplicator,
} from '../../../src/utils/deduplication';

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator<string>;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator<string>({
      defaultTimeout: 1000,
      maxConcurrentRequests: 5,
      cleanupInterval: 100,
    });
  });

  afterEach(() => {
    deduplicator.destroy();
  });

  describe('execute', () => {
    it('should execute a unique request', async () => {
      const requestFn = mock(() => Promise.resolve('result1'));

      const result = await deduplicator.execute('key1', requestFn);

      expect(result).toBe('result1');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate identical concurrent requests', async () => {
      const requestFn = mock(
        () => new Promise(resolve => setTimeout(() => resolve('result'), 50))
      );

      // Start multiple identical requests concurrently
      const promises = [
        deduplicator.execute('key1', requestFn),
        deduplicator.execute('key1', requestFn),
        deduplicator.execute('key1', requestFn),
      ];

      const results = await Promise.all(promises);

      // All should get the same result
      expect(results).toEqual(['result', 'result', 'result']);

      // But the function should only be called once
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should handle different request keys separately', async () => {
      const requestFn1 = mock(() => Promise.resolve('result1'));
      const requestFn2 = mock(() => Promise.resolve('result2'));

      const [result1, result2] = await Promise.all([
        deduplicator.execute('key1', requestFn1),
        deduplicator.execute('key2', requestFn2),
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors to all waiting callers', async () => {
      const error = new Error('Request failed');
      const requestFn = mock(() => Promise.reject(error));

      const promises = [
        deduplicator.execute('key1', requestFn),
        deduplicator.execute('key1', requestFn),
      ];

      await expect(Promise.all(promises)).rejects.toThrow('Request failed');
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('should handle request timeout', async () => {
      const requestFn = mock(
        () => new Promise(resolve => setTimeout(resolve, 2000)) // Longer than timeout
      );

      await expect(
        deduplicator.execute('key1', requestFn, 100)
      ).rejects.toThrow('Request timed out after 100ms');
    });

    it('should enforce max concurrent requests limit', async () => {
      const promises: Promise<string>[] = [];

      // Create more requests than the limit
      for (let i = 0; i < 6; i++) {
        const requestFn = mock(
          () =>
            new Promise(resolve => setTimeout(() => resolve(`result${i}`), 100))
        );

        if (i < 5) {
          // First 5 should succeed
          promises.push(deduplicator.execute(`key${i}`, requestFn));
        } else {
          // 6th should fail due to limit
          await expect(
            deduplicator.execute(`key${i}`, requestFn)
          ).rejects.toThrow('Too many concurrent requests');
        }
      }

      // Clean up pending requests
      const results = await Promise.allSettled(promises);
      expect(results.length).toBe(5);
    });
  });

  describe('isPending', () => {
    it('should return true for pending requests', async () => {
      const requestFn = mock(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const promise = deduplicator.execute('key1', requestFn);

      expect(deduplicator.isPending('key1')).toBe(true);
      expect(deduplicator.isPending('key2')).toBe(false);

      await promise;
      expect(deduplicator.isPending('key1')).toBe(false);
    });
  });

  describe('getWaitingCallers', () => {
    it('should track number of waiting callers', async () => {
      const requestFn = mock(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      // Start first request
      const promise1 = deduplicator.execute('key1', requestFn);
      expect(deduplicator.getWaitingCallers('key1')).toBe(1);

      // Start second identical request (should be deduplicated)
      const promise2 = deduplicator.execute('key1', requestFn);
      expect(deduplicator.getWaitingCallers('key1')).toBe(2);

      await Promise.all([promise1, promise2]);
      expect(deduplicator.getWaitingCallers('key1')).toBe(0);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending request', async () => {
      const requestFn = mock(
        () => new Promise(resolve => setTimeout(() => resolve('result'), 100))
      );

      const promise = deduplicator.execute('key1', requestFn);

      expect(deduplicator.isPending('key1')).toBe(true);
      expect(deduplicator.cancel('key1')).toBe(true);
      expect(deduplicator.isPending('key1')).toBe(false);

      // The promise should still resolve since we don't interrupt it, just clean up tracking
      await expect(promise).resolves.toBe('result');
    });

    it('should return false for non-existent requests', () => {
      expect(deduplicator.cancel('nonexistent')).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('should cancel all pending requests', async () => {
      const requestFn = mock(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const promises = [
        deduplicator.execute('key1', requestFn),
        deduplicator.execute('key2', requestFn),
        deduplicator.execute('key3', requestFn),
      ];

      expect(deduplicator.getStats().pendingRequests).toBe(3);

      const cancelledCount = deduplicator.cancelAll();
      expect(cancelledCount).toBe(3);
      expect(deduplicator.getStats().pendingRequests).toBe(0);

      // Promises should still settle
      await Promise.allSettled(promises);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      const requestFn1 = mock(() => Promise.resolve('result1'));
      const requestFn2 = mock(
        () => new Promise(resolve => setTimeout(() => resolve('result2'), 50))
      );

      // Unique request
      await deduplicator.execute('key1', requestFn1);

      // Deduplicated requests
      const promises = [
        deduplicator.execute('key2', requestFn2),
        deduplicator.execute('key2', requestFn2), // Should be deduplicated
      ];

      const stats = deduplicator.getStats();
      expect(stats.uniqueRequests).toBe(2); // key1 and key2
      expect(stats.deduplicatedRequests).toBe(1); // Second key2 request
      expect(stats.pendingRequests).toBe(1); // key2 still pending

      await Promise.all(promises);

      const finalStats = deduplicator.getStats();
      expect(finalStats.pendingRequests).toBe(0);
      expect(finalStats.deduplicationRatio).toBe(1 / 3); // 1 deduplicated out of 3 total
    });
  });

  describe('cleanup', () => {
    it('should clean up stuck requests that exceed timeout + grace period', () => {
      // Add a request directly to simulate a stuck request that removes itself when cleanup is called
      const timestamp = Date.now() - 10000; // 10 seconds ago
      const mockRequest = {
        promise: Promise.resolve('test'),
        timestamp,
        timeout: 1000, // 1 second timeout
        cleanup: mock(() => {
          // Mock the actual cleanup behavior - remove from map
          deduplicator['pendingRequests'].delete('stuck-key');
        }),
        waitingCallers: 1,
      };

      deduplicator['pendingRequests'].set('stuck-key', mockRequest as never);

      const cleanedCount = deduplicator.cleanup();
      expect(cleanedCount).toBe(1);
      expect(mockRequest.cleanup).toHaveBeenCalledTimes(1);
      expect(deduplicator.isPending('stuck-key')).toBe(false);
    });

    it('should not clean up recent requests', () => {
      // Add a recent request
      const mockRequest = {
        promise: Promise.resolve('test'),
        timestamp: Date.now(), // Just now
        timeout: 1000,
        cleanup: mock(() => {}),
        waitingCallers: 1,
      };

      deduplicator['pendingRequests'].set('recent-key', mockRequest as never);

      const cleanedCount = deduplicator.cleanup();
      expect(cleanedCount).toBe(0);
      expect(mockRequest.cleanup).not.toHaveBeenCalled();
      expect(deduplicator.isPending('recent-key')).toBe(true);

      // Clean up manually
      deduplicator.cancel('recent-key');
    });
  });
});

describe('createRequestKey', () => {
  it('should create consistent keys for identical parameters', () => {
    const params1 = { query: 'test', model: 'gpt-4', temperature: 0.3 };
    const params2 = { query: 'test', model: 'gpt-4', temperature: 0.3 };

    expect(createRequestKey(params1)).toBe(createRequestKey(params2));
  });

  it('should create different keys for different parameters', () => {
    const params1 = { query: 'test1', model: 'gpt-4' };
    const params2 = { query: 'test2', model: 'gpt-4' };

    expect(createRequestKey(params1)).not.toBe(createRequestKey(params2));
  });

  it('should be order-independent', () => {
    const params1 = { a: 1, b: 2, c: 3 };
    const params2 = { c: 3, a: 1, b: 2 };

    expect(createRequestKey(params1)).toBe(createRequestKey(params2));
  });

  it('should handle nested objects and arrays', () => {
    const params1 = {
      query: 'test',
      options: { model: 'gpt-4', temperature: 0.3 },
      tags: ['ai', 'test'],
    };
    const params2 = {
      query: 'test',
      options: { model: 'gpt-4', temperature: 0.3 },
      tags: ['ai', 'test'],
    };

    expect(createRequestKey(params1)).toBe(createRequestKey(params2));
  });
});

describe('searchDeduplicator', () => {
  it('should be a singleton instance', () => {
    expect(searchDeduplicator).toBeDefined();
    expect(searchDeduplicator).toBeInstanceOf(RequestDeduplicator);
  });

  it('should have appropriate default configuration', () => {
    const stats = searchDeduplicator.getStats();
    expect(stats.maxConcurrentRequests).toBe(100);
  });
});
