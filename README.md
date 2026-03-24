# Level 2 — AI Integration Interview

Welcome to Level 2 of the AI-assisted engineering interview. If you are here, you have already demonstrated basic comfort with AI coding tools in Level 1. This round evaluates how you **think critically about AI-generated and AI-assisted output** in realistic engineering scenarios.

## What This Tests

Each challenge targets a different dimension of working effectively with AI:

| Challenge | Skill Tested |
|-----------|-------------|
| **01 — Refactoring** | Can you use AI to refactor messy code without breaking working tests? |
| **02 — Code Review** | Can you catch subtle security bugs in AI-generated code? |
| **03 — Testing** | Can you design thorough tests for well-written code, going beyond what AI typically generates? |

## Ground Rules

- You may use **any AI tool** — ChatGPT, Claude, Copilot, Cursor, or anything else.
- There is no restriction on how many times you prompt or which workflow you use.
- The evaluation is based on the **quality of your final output**, not on whether you used AI.
- We care about your ability to **identify where AI output falls short** and improve it.

## Evaluation Criteria

- **Critical thinking about AI output** — Do you accept the first response or iterate?
- **Security awareness** — Do you catch the issues AI tools commonly miss?
- **Iterative refinement** — Do you verify, test, and improve generated code?
- **Test design thinking** — Do you go beyond happy-path coverage?
- **Code quality judgment** — Can you distinguish clean code from code that merely works?

## Setup

```bash
# Install dependencies
npm install

# Run all tests (should pass out of the box)
npm test

# Run tests for a specific challenge
npm run test:01
npm run test:03
```

Verify that all existing tests pass before you begin. If something fails during setup, flag it — that is not part of the interview.

## Challenges

### Challenge 01 — Refactoring (`challenges/01-refactoring/`)
A working but messy order processing module. All 25+ tests pass. Your job is to refactor without breaking anything.

### Challenge 02 — Code Review (`challenges/02-code-review/`)
An authentication service written with AI assistance. Review it for security issues and document your findings.

### Challenge 03 — Testing (`challenges/03-testing/`)
A clean LRU cache implementation. A few starter tests are provided. Write comprehensive test coverage.

---

Good luck. Focus on demonstrating judgment, not just speed.
