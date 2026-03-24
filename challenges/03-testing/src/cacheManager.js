/**
 * LRU Cache Manager
 *
 * A Least Recently Used cache with configurable max size and TTL (time-to-live).
 * When the cache reaches capacity, the least recently accessed entry is evicted.
 * Entries automatically expire after their TTL elapses.
 */

class CacheManager {
  /**
   * @param {number} maxSize - Maximum number of entries the cache can hold.
   * @param {number} ttlMs - Default time-to-live in milliseconds for each entry.
   */
  constructor(maxSize = 100, ttlMs = 60000) {
    if (maxSize < 1) {
      throw new Error('maxSize must be at least 1');
    }
    if (ttlMs < 0) {
      throw new Error('ttlMs must be non-negative');
    }

    this._maxSize = maxSize;
    this._ttlMs = ttlMs;
    this._store = new Map();     // key -> { value, expiresAt }
    this._stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Stores a value in the cache.
   * If the key already exists, it is updated and moved to most-recent position.
   * If the cache is full, the least recently used entry is evicted.
   *
   * @param {string} key
   * @param {*} value
   * @param {number} [customTtl] - Optional TTL override in milliseconds.
   */
  set(key, value, customTtl) {
    // If key exists, delete it first so re-insertion moves it to the end (most recent)
    if (this._store.has(key)) {
      this._store.delete(key);
    }

    // Evict LRU entry if at capacity
    if (this._store.size >= this._maxSize) {
      const lruKey = this._store.keys().next().value;
      this._store.delete(lruKey);
      this._stats.evictions++;
    }

    const ttl = customTtl !== undefined ? customTtl : this._ttlMs;
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Retrieves a value from the cache.
   * Returns null if the key does not exist or has expired.
   * Accessing a key moves it to the most-recent position.
   *
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const entry = this._store.get(key);

    if (!entry) {
      this._stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._stats.misses++;
      return null;
    }

    // Move to most-recent position: delete and re-insert
    this._store.delete(key);
    this._store.set(key, entry);

    this._stats.hits++;
    return entry.value;
  }

  /**
   * Removes an entry from the cache.
   * @param {string} key
   * @returns {boolean} True if the entry existed and was removed.
   */
  delete(key) {
    return this._store.delete(key);
  }

  /**
   * Removes all entries from the cache. Stats are preserved.
   */
  clear() {
    this._store.clear();
  }

  /**
   * Checks whether a key exists in the cache and has not expired.
   * Does NOT update access order (non-destructive peek).
   *
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this._store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Returns an array of all non-expired keys currently in the cache.
   * Expired entries are cleaned up during this call.
   *
   * @returns {string[]}
   */
  keys() {
    const result = [];
    for (const [key, entry] of this._store) {
      if (Date.now() > entry.expiresAt) {
        this._store.delete(key);
      } else {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Returns cache statistics.
   * @returns {{ hits: number, misses: number, evictions: number, size: number }}
   */
  getStats() {
    return {
      hits: this._stats.hits,
      misses: this._stats.misses,
      evictions: this._stats.evictions,
      size: this._store.size
    };
  }

  /**
   * Current number of entries (including potentially expired ones not yet cleaned).
   * @returns {number}
   */
  get size() {
    return this._store.size;
  }
}

module.exports = CacheManager;
