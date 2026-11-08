# Assignment #04 — Smart Campus Room Availability Checker
## Analysis, refactoring and quality report

- **Initial version:** tag `v0-baseline` → commit `9badd8c` (the Practice #08 fixed prototype, one-file domain logic, 3 rooms).
- **Final version:** `HEAD` of branch `master` (see `git log v0-baseline..HEAD`).
- **AI assistant:** Claude Code, model Claude Opus 5.5 — full record in [`AI_LOG.md`](../AI_LOG.md).

---

## Task #01 — Codebase analysis

### Context given to the AI assistant
1. **Repository map** (baseline):

| File | Responsibility |
|---|---|
| `src/main.tsx` | React entry point |
| `src/App.tsx` (222 lines) | all state, time parsing, duration hint, live clock, layout of all 3 steps |
| `src/lib/types.ts` | `Booking`, `Room`, `CheckResult` |
| `src/lib/data.ts` | `ROOMS` — 3 fictional rooms (exported mutable array) |
| `src/lib/availability.ts` | time helpers, `intervalsOverlap`, `checkAvailability` (pure) |
| `src/components/RoomSelector.tsx` | room cards |
| `src/components/TimeField.tsx` | `<input type="time">` + unused helper `minutesToTimeInput` |
| `src/components/Timeline.tsx` | day timeline (bookings, candidate, "now") |
| `src/components/ResultPanel.tsx` | Available / Unavailable message |
| `src/lib/roomAvailability.test.ts` | 30 Vitest unit tests |

2. **Acceptance criteria to preserve:** AC1 valid time · AC2 120-minute maximum · AC3 blocked room · AC4 overlap rules (touching is allowed) · AC5 immutable booking data · AC6 clear responsive feedback.
3. **New requirements:** ≥4 rooms with id, name, capacity, equipment, blocked, bookings; F1 capacity ≥ attendees; F2 all selected equipment; F3 blocked never reported available; F4 empty state; F5 switching room refreshes the result.
4. **Constraints:** no login, payments, live APIs or database; fictional data only; fixed current time; small steps, not a rewrite.

### Baseline measurements
| Measure | Value | How obtained |
|---|---|---|
| Tests | **30 passed / 30** | `npx vitest run` → `docs/evidence/00-baseline-tests.txt` |
| Type check | 0 errors | `npx tsc --noEmit -p tsconfig.app.json` |
| Lint | 1 error, 1 warning | `npx eslint .` (unused import in `App.tsx`; non-component export in `TimeField.tsx`) |
| Rooms in catalog | 3, no equipment field | `src/lib/data.ts` |

### Maintainability risks (with references to baseline code)

**R1 — Time/interval validation is duplicated outside the domain module.**
The canonical rules live in `checkAvailability()` (`src/lib/availability.ts:48` start < end, `:55` inside the day, `:70` max 120 min), but they are re-implemented in the UI:
- `App.tsx:58` — `startMin === null || endMin === null` check and its error message exist **only** in the component, so this AC1 rule is not unit-testable;
- `App.tsx:82` — `endMin > startMin` to compute the duration;
- `App.tsx:86` — `duration > MAX_BOOKING_MINUTES` (copy of the AC2 rule);
- `Timeline.tsx:66` — `candidateStart >= 0 && candidateEnd <= MINUTES_PER_DAY && candidateStart < candidateEnd`.
If the 120-minute limit or the day range changes, four places must change together → the UI hint and the real decision can disagree.

**R2 — Booking data is a shared mutable array (AC5 risk).**
`src/lib/data.ts` exports `ROOMS: Room[]` without `readonly` or freezing, and `App.tsx:33` puts that same reference into state. Any `room.bookings.push(...)` or `sort()` anywhere would silently modify the "source of truth" for every later check. There was **no test** for AC5.

**R3 — `App.tsx` is a god-component.**
It owns state, string→minute parsing, duration rules, a live clock (`setInterval` + `new Date()`, `App.tsx:20–45`) and the markup of every step; the section-heading markup is copy-pasted three times (`App.tsx:110, 128, 207`). Adding filters here would make it larger and harder to test.

**R4 — The data model cannot express the new feature.**
`Room` (`src/lib/types.ts`) has no `equipment`; `RoomSelector` always renders every room and has no empty state, so F1–F4 have nowhere to live without touching types, data and UI at once.

**R5 — Non-deterministic "now".**
`App.tsx` read the system clock every second, while the brief requires a fixed current time; results and screenshots depended on when the app was opened.

**R6 — Dead / duplicated helpers.**
`TimeField.tsx:21 minutesToTimeInput()` is just `minutesToLabel()` again (and causes the lint warning); `nowClockLabel()` (`App.tsx:23–29`) re-implements the `padStart` formatting of `minutesToLabel()`; `@supabase/supabase-js` was a dependency although no database is allowed.

**R7 — Test names do not match the brief.**
`roomAvailability.test.ts` labels its groups "AC1 — Overlap", "AC2 — Status", "AC3 — Edge cases", while the brief numbers AC1 = time, AC2 = 120 min, AC3 = blocked, AC4 = overlap, AC5 = immutability. A reviewer cannot map tests to criteria.

### Duplicated-logic inventory (used later as a metric)
Found with `git grep -n` on `v0-baseline` (see Task #05):

| # | Duplicate location | Canonical place |
|---|---|---|
| 1 | `App.tsx:58` null-time check + message | none in domain |
| 2 | `App.tsx:82` start < end for duration | `availability.ts:48` |
| 3 | `App.tsx:86` max-duration check | `availability.ts:70` |
| 4 | `Timeline.tsx:66` interval well-formed check | `availability.ts:48,55` |
| 5 | `App.tsx:23–29` `nowClockLabel` formatting | `minutesToLabel` |
| 6 | `TimeField.tsx:21` `minutesToTimeInput` | `minutesToLabel` |
| 7 | `App.tsx:128` section heading copy | `App.tsx:110` |
| 8 | `App.tsx:207` section heading copy | `App.tsx:110` |

**Total: 8 duplicated logic/rendering locations.**

### Prioritized improvement plan (agreed before editing code)
| Priority | Step | Addresses | Safety net |
|---|---|---|---|
| P0 | Record baseline, tag `v0-baseline`, remove unused DB dependency, fixed current time | R5, R6 | 30 existing tests |
| P1 | Align test names to AC1–AC6 and add the missing AC5 immutability test **before** refactoring | R7, R2 | regression suite |
| P2 | Split into `data/`, `domain/` (time, availability, filter), `components/` | R3 | tests after each move |
| P3 | One `validateInterval()` / `durationOf()` in `domain/time.ts`, used by domain and UI | R1 | AC1/AC2 tests |
| P4 | Deep-freeze room data, `readonly` types | R2 | AC5 test |
| P5 | Extend model with `equipment`, ≥4 rooms; add `filterRooms()`; filter UI + empty state + refresh on room switch | R4, F1–F5 | new F-tests + UI test |

Every step is one commit and is followed by `npx vitest run` and `npx tsc`.

### AI suggestions rejected or modified
1. **Modified — shallow `Object.freeze` for AC5.** The initial plan (AI-generated, in my notes) said "bookings are not mutated (`Object.freeze` / copy)". `Object.freeze(ROOMS)` only freezes the outer array: `ROOMS[0].bookings.push(...)` would still work. I changed it to a recursive `deepFreeze()` and added a test that tries to push into a room's bookings and expects a `TypeError` (see Task #04).
2. **Modified — target structure.** The suggested layout (`main.js`, `ui/render.js`, `domain/*.js`) is for a vanilla-JS app. This project is React + TypeScript, so presentation stays in React components (`src/components/`), and only the pure parts become `src/domain/*.ts` and `src/data/rooms.ts`. A rewrite to another framework was not considered — the brief asks for small steps.
3. **Modified — "write regression tests for ~1 hour".** The plan assumed no tests existed. The baseline already had 30 passing tests that cover AC1–AC4, so instead of rewriting them I only renamed the groups to the brief's AC numbers and added the missing AC5 test.
