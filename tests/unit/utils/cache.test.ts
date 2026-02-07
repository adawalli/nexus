import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  setSystemTime,
} from 'bun:test';

import {
  TTLCache,
  createCacheKey,
  searchCache,
} from '../../../src/utils/cache';

describe('TTLCache', () => {
  let cache: TTLCache<string>;
  let now: number;

  beforeEach(() => {
    now = Date.now();
    setSystemTime(new Date(now));
    cache = new TTLCache<string>({
      defaultTtl: 1000,
      maxSize: 5,
      cleanupInterval: 500,
    });
  });

  afterEach(() => {
    cache.destroy();
    setSystemTime();
  });

  describe('get', () => {
    it('should return undefined for non-existent key', () => {
      const result = cache.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return value for existing key', () => {
      cache.set('key1', 'value1');

      const result = cache.get('key1');

      expect(result).toBe('value1');
    });

    it('should return undefined for expired entry', () => {
      cache.set('key1', 'value1', 100);

      now += 101;
      setSystemTime(new Date(now));

      const result = cache.get('key1');

      expect(result).toBeUndefined();
    });

    it('should delete expired entry on access', () => {
      cache.set('key1', 'value1', 100);

      now += 101;
      setSystemTime(new Date(now));
      cache.get('key1');

      expect(cache.size()).toBe(0);
    });

    it('should increment hits counter for valid entries', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
    });

    it('should increment misses counter for missing/expired entries', () => {
      cache.get('nonexistent');
      cache.set('key1', 'value1', 100);
      now += 101;
      setSystemTime(new Date(now));
      cache.get('key1');

      const stats = cache.getStats();

      expect(stats.misses).toBe(2);
    });
  });

  describe('set', () => {
    it('should store value with default TTL', () => {
      cache.set('key1', 'value1');

      expect(cache.get('key1')).toBe('value1');
    });

    it('should store value with custom TTL', () => {
      cache.set('key1', 'value1', 500);

      now += 400;
      setSystemTime(new Date(now));
      expect(cache.get('key1')).toBe('value1');

      now += 200;
      setSystemTime(new Date(now));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should update existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      expect(cache.get('key1')).toBe('value2');
      expect(cache.size()).toBe(1);
    });

    it('should evict oldest entry when max size is reached', () => {
      cache.set('key1', 'value1');
      now += 10;
      setSystemTime(new Date(now));
      cache.set('key2', 'value2');
      now += 10;
      setSystemTime(new Date(now));
      cache.set('key3', 'value3');
      now += 10;
      setSystemTime(new Date(now));
      cache.set('key4', 'value4');
      now += 10;
      setSystemTime(new Date(now));
      cache.set('key5', 'value5');
      now += 10;
      setSystemTime(new Date(now));

      // This should evict key1 (oldest)
      cache.set('key6', 'value6');

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.size()).toBe(5);
      expect(cache.get('key6')).toBe('value6');
    });

    it('should not evict when updating existing key at max size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      // Update existing key - should not evict
      cache.set('key1', 'updated');

      expect(cache.size()).toBe(5);
      expect(cache.get('key1')).toBe('updated');
    });
  });

  describe('has', () => {
    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return true for existing key', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for expired key', () => {
      cache.set('key1', 'value1', 100);

      now += 101;
      setSystemTime(new Date(now));

      expect(cache.has('key1')).toBe(false);
    });

    it('should delete expired entry when checking', () => {
      cache.set('key1', 'value1', 100);

      now += 101;
      setSystemTime(new Date(now));
      cache.has('key1');

      expect(cache.size()).toBe(0);
    });
  });

  describe('delete', () => {
    it('should remove existing key', () => {
      cache.set('key1', 'value1');

      const result = cache.delete('key1');

      expect(result).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent key', () => {
      const result = cache.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should reset statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('key1');
      cache.get('nonexistent');

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
      expect(stats.hitRatio).toBeCloseTo(2 / 3);
    });

    it('should return 0 hit ratio when no requests', () => {
      const stats = cache.getStats();

      expect(stats.hitRatio).toBe(0);
    });
  });

  describe('keys', () => {
    it('should return empty array for empty cache', () => {
      expect(cache.keys()).toEqual([]);
    });

    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const keys = cache.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size()).toBe(0);
    });

    it('should return correct size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.size()).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 200);
      cache.set('key3', 'value3', 500);

      now += 150;
      setSystemTime(new Date(now));

      const removedCount = cache.cleanup();

      expect(removedCount).toBe(1);
      expect(cache.size()).toBe(2);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeDefined();
    });

    it('should return 0 when no entries expired', () => {
      cache.set('key1', 'value1', 1000);

      const removedCount = cache.cleanup();

      expect(removedCount).toBe(0);
    });

    it('should run automatically at cleanup interval', async () => {
      // Reset system time so Date.now() works normally during the setInterval
      setSystemTime();

      cache.set('key1', 'value1', 100);

      // Wait for automatic cleanup (real timer)
      await Bun.sleep(600);

      expect(cache.size()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should stop cleanup timer and clear cache', () => {
      cache.set('key1', 'value1');

      cache.destroy();

      expect(cache.size()).toBe(0);
    });
  });

  describe('default options', () => {
    it('should use default values when no options provided', () => {
      const defaultCache = new TTLCache<string>();

      defaultCache.set('key', 'value');
      expect(defaultCache.get('key')).toBe('value');

      const stats = defaultCache.getStats();
      expect(stats.maxSize).toBe(1000);

      defaultCache.destroy();
    });
  });
});

describe('createCacheKey', () => {
  it('should create consistent keys for same params', () => {
    const params1 = { query: 'test', model: 'gpt-4' };
    const params2 = { query: 'test', model: 'gpt-4' };

    expect(createCacheKey(params1)).toBe(createCacheKey(params2));
  });

  it('should create different keys for different params', () => {
    const params1 = { query: 'test1' };
    const params2 = { query: 'test2' };

    expect(createCacheKey(params1)).not.toBe(createCacheKey(params2));
  });

  it('should sort keys for consistent output', () => {
    const params1 = { z: 1, a: 2 };
    const params2 = { a: 2, z: 1 };

    expect(createCacheKey(params1)).toBe(createCacheKey(params2));
  });

  it('should handle nested objects', () => {
    const params = { query: 'test', options: { temperature: 0.5 } };

    const key = createCacheKey(params);

    expect(key).toContain('options');
    expect(key).toContain('temperature');
  });

  it('should handle arrays', () => {
    const params = { items: [1, 2, 3] };

    const key = createCacheKey(params);

    expect(key).toContain('[1,2,3]');
  });

  it('should handle empty object', () => {
    const key = createCacheKey({});

    expect(key).toBe('');
  });
});

describe('searchCache', () => {
  it('should be a TTLCache instance', () => {
    expect(searchCache).toBeInstanceOf(TTLCache);
  });

  it('should have configured max size', () => {
    const stats = searchCache.getStats();

    expect(stats.maxSize).toBe(500);
  });
});
