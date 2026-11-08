# Smart Campus Room Availability Checker

Prototype for Software Engineering Assignment #04. Pick a room from a small fictional catalog, filter by capacity and equipment, and check whether a time interval is free.
No login, payments, live APIs or database. All data is fictional and the current time is fixed at **08:00**.

## Requirements
- Node.js 18+ (tested with Node 24) and npm

## Setup
```bash
npm install
```

## Run
```bash
npm run dev
```
Then open the URL Vite prints (default http://localhost:5173).

## Test
```bash
npm test
```
`npm test` runs `vitest run`, which executes 49 tests in 3 files. Other checks:

```bash
npm run typecheck
```

```bash
npm run lint
```

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
  App.tsx                  UI state + wiring
tests/
  regression.test.ts       AC1–AC6 regression suite
  filter.test.ts           catalog + F1–F5
  app.ui.test.tsx          React UI integration test (jsdom)
docs/
  REPORT.md                analysis, refactoring, diagrams, quality evaluation, reflection
  HUMAN_REVIEW.md          what the student checked personally after the AI work
  evidence/                real test runs, mutation check, metrics
  screenshots/             demo scenarios
AI_LOG.md                  AI-use record
```

## Versions
- Repository: https://github.com/a-naimankhan/SWE-assigmnet- (branch `master`)
- Initial version: tag `v0-baseline` (commit `9badd8c`)
- Final version: `master` HEAD. Run `git log --oneline v0-baseline..HEAD` to see one commit per change.
