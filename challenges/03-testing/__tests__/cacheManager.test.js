const CacheManager = require('../src/cacheManager');

/*
 * STARTER TESTS — a few basics to get you going.
 *
 * Your task: expand this file with comprehensive tests covering:
 *
 *   1. Basic CRUD — set, get, delete, clear
 *   2. LRU eviction — least recently used items are evicted when cache is full
 *   3. TTL expiration — items expire after their time-to-live
 *   4. Edge cases — empty cache, single-item cache, capacity boundary
 *   5. Stats tracking — hits, misses, evictions counted correctly
 *   6. has() and keys() — including behavior with expired entries
 *   7. Custom TTL — per-entry TTL overrides the default
 *   8. Access-order updates — get() moves an item to most-recent position
 *   9. Overwrite behavior — set() on existing key updates value and position
 *  10. Interaction patterns — sequences that reveal ordering bugs
 *
 * Aim for 30+ meaningful tests. Quality matters more than quantity.
 */

describe('CacheManager', () => {
  test('stores and retrieves a value', () => {
    const cache = new CacheManager(10, 5000);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  test('returns null for missing keys', () => {
    const cache = new CacheManager(10, 5000);
    expect(cache.get('nonexistent')).toBeNull();
  });

  test('respects maxSize by evicting LRU entry', () => {
    const cache = new CacheManager(2, 5000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // should evict 'a'
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });
});
