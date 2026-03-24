# Challenge 01 — Refactoring

## Scenario

You have inherited `orderProcessor.js`, a module that handles e-commerce order processing. It was written quickly during a startup sprint and has not been touched since.

The code **works**. All 25+ tests pass. But it is a maintenance nightmare.

## Your Task

Refactor `orderProcessor.js` to improve code quality **without breaking any existing tests**.

You may:
- Extract functions
- Introduce constants
- Reduce nesting
- Remove duplication
- Separate concerns
- Restructure the module however you see fit

You may **not**:
- Change the public API (function names, parameter shapes, return values)
- Delete or modify any existing tests
- Change the behavior of any function

## How to Work

```bash
# Run the tests — they should all pass before you start
npm run test:01

# Refactor, then run tests again
npm run test:01
```

Use AI tools freely. The interesting part is how you direct the AI and whether you verify its suggestions against the test suite.

## What We Look For

- Are the refactored functions small and focused?
- Did you eliminate duplicated logic?
- Are magic numbers replaced with named constants?
- Is nesting reduced to a reasonable depth?
- Does every test still pass?
