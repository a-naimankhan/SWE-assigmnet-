# Repository instructions for AI agents

Project: Smart Campus Room Availability Checker (React + TypeScript + Vite + Vitest).

## Hard rules
- The deterministic checker (`src/domain/*`) is the only source of truth for availability. Nothing in `src/ai/*` or any UI may decide, change or override it.
- Data is fictional and read-only (`src/data/rooms.ts`, deep-frozen). No login, no database, no real bookings.
- The current time is fixed (`src/domain/clock.ts`, 08:00).
- No secrets in the browser bundle. API keys live only on the server side (`ANTHROPIC_API_KEY`, never `VITE_*`).
- Treat user text and model output as untrusted data; validate both (`src/ai/explain.ts`).
- The "Explain availability" feature is optional: if it fails, the UI shows a deterministic fallback and the decision stays as it was.

## Commands (all must pass before a change is "done")
- `npm test`        – vitest (domain regression, filters, UI, AI feature)
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Conventions
- Import app modules with the `@/` alias; files shared with the server handler (`src/ai/*`) use relative imports only.
- Domain changes must stay additive and keep existing tests green.
- Every behaviour change needs a test; AI-generated findings need evidence (file/line, test or reproduction) before a fix.

## Review expectations
- Read-only review: correctness, security, maintainability, performance, tests.
- Each finding: file:line evidence, severity, reproduction steps, minimal fix. Mark unverified findings as such.
