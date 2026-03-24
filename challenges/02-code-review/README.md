# Challenge 02 — Code Review

## Scenario

A junior developer used AI tools to write an authentication service (`authService.js`). They opened a pull request and asked you to review it.

The code looks clean, is well-documented, and appears functional. But there are **subtle security and correctness issues** that AI tools commonly produce — the kind that pass a casual review but would be dangerous in production.

## Your Task

Review `src/authService.js` thoroughly and document your findings in `review-template.md`.

For each issue you find:
1. Describe the problem.
2. Rate its severity: **critical**, **high**, **medium**, or **low**.
3. Identify the location (function name and approximate line).
4. Suggest a concrete fix.
5. Note whether you used an AI tool to help find it.

## What We Look For

- Can you spot security issues that AI tools tend to miss or introduce?
- Do you understand *why* each issue matters, not just that it exists?
- Are your suggested fixes correct and practical?
- Can you prioritize by severity?

There are **at least 6 distinct issues** across the module. Some are critical. Some are more subtle.

## How to Work

Read the code carefully. Use AI tools if you want — but note that AI tools sometimes *introduce* these exact patterns, so be critical of AI-generated review feedback too.

There are no automated tests for this challenge. Your deliverable is the completed `review-template.md`.
