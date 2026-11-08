# Human review record

The AI assistant (Claude Code) wrote the code, tests and first drafts of the documents.
This file records what **I** checked myself afterwards and what I saw.
Anything not listed here was checked only by the assistant (see `AI_LOG.md`).

**Reviewer:** Naimankhan Aibar 24B031919
**Date:** 2026-11-08

---

## 1. Code and tests read

| Item | Read? | Notes |
|---|---|---|
| Test files (`tests/regression.test.ts`, `tests/filter.test.ts`, `tests/app.ui.test.tsx`) | ✅ | Looked through what each test checks. |

## 2. Commands re-run by me

| Command | Expected | What I saw | OK? |
|---|---|---|---|
| `npm test` (Vitest) | `Tests 49 passed (49)` | All 49 tests passed | ✅ |
| `npm run lint` | no problems | No output, no problems | ✅ |
| `npm run typecheck` | no errors | No output, no errors | ✅ |

## 3. Manual checks in the running app (`npm run dev`)

| Check | Rule | What I saw | OK? |
|---|---|---|---|
| Interval longer than 120 minutes | AC2 | Rejected with the 120-minute message | ✅ |
| Interval overlapping an existing booking | AC4 | Reported as unavailable | ✅ |
| Start time later than end time | AC1 | Rejected with a clear message | ✅ |
| Attendees filter | F1 | Only rooms with enough capacity are listed | ✅ |
| Equipment (requirements) filter | F2 | Each room has its own equipment list; the list is filtered by the selected items | ✅ |
| Each room has its own bookings | F4 | The timeline changes with the selected room; every room shows its own schedule | ✅ |

Everything behaved as expected.

## 4. How I understand the new feature (in my own words)

Every room now has a capacity and a list of equipment. The user enters the number of attendees and
ticks the required equipment. The room list then shows only rooms that are big enough and have all
of the ticked equipment. Each room keeps its own bookings, so the timeline and the availability
result always belong to the selected room.

## 5. Not checked by me

These were checked only by the assistant (tests, screenshots, `docs/evidence/`):
- blocked room (AC3) and start time before the fixed current time 08:00;
- re-checking automatically after switching rooms (F5);
- invalid attendee input such as `0`;
- the mutation check and the before/after metrics.

## 6. Problems found

None in the checks above.
