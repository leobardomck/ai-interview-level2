# Challenge 03 — Testing

## Scenario

A colleague wrote a clean, well-implemented LRU cache module (`cacheManager.js`). It works correctly. Your job is to write comprehensive tests for it.

A minimal test file is provided with 2-3 basic tests as a starting point. You need to expand it significantly.

## Your Task

Write thorough tests for `cacheManager.js` in `__tests__/cacheManager.test.js`.

Your test suite should cover:
- Basic CRUD operations (set, get, delete, clear)
- LRU eviction behavior (least recently used items evicted first)
- TTL expiration (items expire after their time-to-live)
- Edge cases (empty cache, single-item cache, capacity boundary)
- Stats tracking (hits, misses, evictions)
- The `has()` and `keys()` methods
- Custom TTL per entry
- Interaction patterns (sequences of operations that might reveal bugs)

## How to Work

```bash
# Run the starter tests
npm run test:03

# Add tests, run again
npm run test:03
```

Use AI tools to help generate tests — but evaluate whether the generated tests are actually meaningful. AI tools tend to produce tests that look comprehensive but miss important edge cases or test implementation details instead of behavior.

## What We Look For

- Do your tests cover **behavior**, not just code paths?
- Did you think about **boundary conditions** and **ordering effects**?
- Are your test descriptions clear and specific?
- Would your tests catch a broken LRU implementation?
- Did you go beyond what a naive AI prompt would generate?
