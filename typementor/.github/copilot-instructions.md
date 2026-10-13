# TypeMentor AI Project Instructions

## Mission

Maintain TypeMentor AI as a production-ready typing coach. Prefer complete, testable improvements over cosmetic changes. Preserve existing user progress, guest mode, authentication, analytics, and privacy behavior.

## Repository Shape

- `frontend/`: React, Vite, TypeScript, Vitest, Playwright.
- `backend/`: Express, TypeScript, Prisma, PostgreSQL, Vitest.
- The root workspace scripts coordinate both packages.
- Frontend development server: `http://localhost:5173`.
- Backend development server: `http://localhost:5000`.
- HMR is available for frontend changes; do not restart a running server unless necessary.

## Working Protocol

1. Inspect the relevant code, tests, and documentation before editing.
2. Check `git status` before starting and do not overwrite unrelated work.
3. Treat handoff notes from another agent as context, not proof; verify them against the current files and tests.
4. Make focused changes that fit existing patterns. Avoid broad rewrites and speculative dependency upgrades.
5. Keep secrets out of source, logs, prompts, commits, and responses.
6. Keep API keys backend-only. Use `safeFetch` for frontend API calls and preserve offline guest-mode isolation.
7. For analytics, use real telemetry or an explicit empty state; never invent user metrics.
8. For AI features, preserve provider isolation, schema validation, timeouts, retries, and local fallback behavior.
9. Update directly related documentation when configuration or developer workflow changes.
10. Do not commit or push unless the user explicitly asks.

## Validation

Run the smallest relevant checks, then escalate when needed:

```text
npm run test -w frontend
npm run test -w backend
npm run build
```

For UI changes, also verify keyboard accessibility, responsive behavior, loading/empty/error states, and the relevant existing test files. For API or database changes, run focused backend tests and confirm authentication and authorization behavior.

## Handoff Contract

At the end of work, report:

- Files changed and why.
- Tests/build commands run and results.
- Any known limitations or follow-up work.
- Whether changes were committed or pushed.

Never claim that a server, test, deployment, or push succeeded without current command evidence.
