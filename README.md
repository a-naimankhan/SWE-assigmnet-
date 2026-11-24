# Smart Campus Room Availability Checker

Prototype for Software Engineering Assignments #04 and #05 (AI-assisted audit, see `docs/ASSIGNMENT-05.md`). Pick a room from a small fictional catalog, filter by capacity and equipment, and check whether a time interval is free.
No login, payments, live APIs or database. All data is fictional and the current time is fixed at **08:00**.

## Requirements
- Node.js 18+ and npm (last verified with Node 22.23.5 / npm 10.9.9)

## Setup
```bash
npm ci
```
Use `npm ci` (not `npm install`) so the committed `package-lock.json` is respected.

## Run
```bash
npm run dev
```
Then open the URL Vite prints (default http://localhost:5173).

## Test
```bash
npm test
```
`npm test` runs `vitest run`, which executes 173 tests in 9 files (149 from Assignment #04 / Practice #11, plus 24 added in Assignment #05 for the output guard and the `/api/explain` hardening). Other checks:

```bash
npm run typecheck
```

```bash
npm run lint
```

## Optional "Explain availability" (Practice #11)
After a check, the **Explain availability** button shows a short explanation. The deterministic checker still decides; the text is labelled and never changes the status.
- Default is a **mock** adapter (no key, no network).
- `?llm=live` calls `/api/explain` (dev/preview server). Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in `.env.local`; without a key the endpoint answers with mock text and the UI says so.
- In dev builds `?llm=timeout|error|contradict|invented|long|malformed` simulates a misbehaving model.
- Report: `docs/PRACTICE-11.md`.
- `/api/explain` is a dev/preview feature: it accepts only the catalog room names, limits the body to 2048 bytes (413) and 20 requests/minute per client (429). Never start the server with `--host`.

## Practice #13 (Lesson 12): code-based vs low-code
- Code-based single-room checker: `npm run dev`, then open `/#/single-room`. Live demo: https://a-naimankhan.github.io/SWE-assigmnet-/#/single-room
- Shared contract and T1–T8: `practice13/shared/contract.json`, sheet `docs/PRACTICE-13-REQUIREMENTS.md`
- Low-code (Appsmith) export and script: `practice13/lowcode/` (how to run it is in its README)
- Report: `docs/PRACTICE-13.md`, PDF `docs/Practice13-Report.pdf`; evidence `docs/evidence/practice13/`, screenshots `docs/screenshots/practice13/`

## Project structure
```
src/
  data/rooms.ts            fictional catalog (5 rooms, deep-frozen)
  domain/                  pure rules, no DOM
    time.ts                time parsing + validateInterval (AC1, AC2)
    availability.ts        overlap + checkAvailability (AC3, AC4)
    filter.ts              capacity / equipment filters (F1–F3)
    immutable.ts           deepFreeze (AC5)
    clock.ts               FIXED_NOW = 08:00
    types.ts               read-only domain types
  components/              presentation only (filters, room list, timeline, result)
  ai/                      Explain availability: contract, validation, adapters, prompts, server handler
  App.tsx                  UI state + wiring
tests/
  regression.test.ts       AC1–AC6 regression suite
  filter.test.ts           catalog + F1–F5
  app.ui.test.tsx          React UI integration test (jsdom)
  explain*.test.ts(x), prompt-eval, review-findings   Explain availability feature
  guard-negation.test.ts, endpoint-hardening.test.ts  Assignment #05 mitigations
docs/
  REPORT.md                Assignment #04 report
  ASSIGNMENT-05.md         Assignment #05 report (audit, risk register, release decision)
  evidence/                real test runs, mutation check, metrics
  screenshots/             demo scenarios
AGENTS.md                  instructions and boundaries for coding agents
AI_LOG.md                  AI-use record (Assignment #04)
```

## Versions
- Assignment #04 baseline: tag `v0-baseline` (commit `9badd8c`)
- Assignment #05 baseline: tag `a5-baseline` (commit `38e585e`, branch `feat/week-11-tasks`)
- Assignment #05 final: branch `feat/assignment-5`. Run `git log --oneline a5-baseline..feat/assignment-5` to see one commit per change.
