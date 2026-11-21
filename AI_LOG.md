# AI-use record (Assignment #04)

**AI assistant used:** Claude Code (desktop app, Code tab), model **Claude Opus 5.5** (`claude-opus-5-5`), Anthropic.
**Mode of use:** the assistant read the repository, proposed plans, edited files and ran commands in my local checkout; I gave the requirements, reviewed every diff and the test output, and decided what to keep.

Each entry: date · tool · prompt summary · output used · problems found · changes made · how verified.

---

## 1. 2026-11-08 · Claude Code · onboarding / baseline check
- **Prompt summary:** gave the assignment PDF and my step-by-step plan; asked whether my current repo (Practice #08 result) can be the starting version.
- **Output used:** inventory of the repo (React + TS + Vite + Vitest, 30 existing tests, `src/lib/availability.ts` already pure), list of gaps vs. the brief (3 rooms instead of ≥4, no `equipment`, real clock instead of a fixed current time, unused `@supabase/supabase-js`, AC numbering in tests not matching the brief, no UI test).
- **Problems found:** first answer had not actually read the PDF (no PDF tooling on the machine) and said so; after installing Python it extracted the text and pointed out the deadline is **today (2026-11-08 23:59)**, not tomorrow as my plan assumed.
- **Changes made:** compressed the plan into one day.
- **Verified:** ran `npx vitest run` myself → `Tests 30 passed (30)`; `npx tsc --noEmit -p tsconfig.app.json` → no errors; `npx eslint .` → 1 error, 1 warning. Saved to `docs/evidence/00-baseline-tests.txt`.
- **Baseline:** tag `v0-baseline` → commit `9badd8c`.

## 2. 2026-11-08 · Claude Code · Task #01 codebase analysis
- **Prompt summary:** "Follow my plan": repository map + AC1–AC6 + F1–F5 + constraints (no login/DB/API, fictional data, fixed time, small steps).
- **Output used:** 7 risks with file:line references (`docs/REPORT.md` Task #01), an 8-item duplicated-logic inventory, and a prioritized plan P0–P5.
- **Problems found:** the plan I had pasted (AI-generated earlier) assumed vanilla JS (`main.js`, `ui/render.js`), assumed there were no tests, and proposed `Object.freeze` for AC5. All three were adapted (see REPORT, "AI suggestions rejected or modified").
- **Verified:** opened every referenced line in `git show v0-baseline:<file>` and confirmed it; the duplicate inventory was re-checked with `git grep -nE` (`docs/evidence/03-metrics.txt`).

## 3. 2026-11-08 · Claude Code · P0 baseline fixes
- **Output used:** removed unused `@supabase/supabase-js`; replaced the live `new Date()` clock with `FIXED_NOW = 08:00`.
- **Verified:** `grep -c supabase package.json package-lock.json` → 0; tests 30/30 after each commit.

## 4. 2026-11-08 · Claude Code · Task #03 refactoring (4 commits)
- **Output used:** move to `data/` + `domain/` + `tests/`; one `validateInterval()`; `deepFreeze` + `readonly` types; `SectionHeading` component.
- **Problems found:** the assistant's first version of the refactor inside `checkAvailability` used `start as number` casts in four places after validation. Rejected as hiding the null case from the compiler; changed so `validateInterval()` returns the narrowed `{ start, end }`. One automated text replacement (regex over JSX headings) silently matched nothing ("replaced 0"); it was caught because `grep -n "<h2"` still showed three headings, and was redone by line numbers.
- **Verified:** after each step `npx tsc`, `npx vitest run`, `npx eslint .`; reviewed each `git diff` before committing.

## 5. 2026-11-08 · Claude Code · Task #02 feature
- **Output used:** 5-room catalog with equipment; `domain/filter.ts`; `RoomFilters` component; empty state; derived result for F5.
- **Problems found / modified:** first draft of `parseAttendees` turned invalid input (e.g. `0`) silently into "no filter". Changed to return an error that is shown inline, because silent acceptance hides a mistake from the user (AC6 clear feedback). The first draft of `App` also used an `eslint-disable` to make a `useMemo` dependency list pass; replaced with a plain derived value.
- **Verified:** manually in the in-app browser: checked Library A 09:00–10:00 → Unavailable, switched to Engineering Lab 3 → Available, Design Studio 2 → blocked; "2 of 5 matching rooms are free 09:00–10:00" matched the data by hand.

## 6. 2026-11-08 · Claude Code · Task #04 tests
- **Output used:** `tests/filter.test.ts` (11), `tests/app.ui.test.tsx` (4, jsdom), extra AC1/AC5 tests in `regression.test.ts`.
- **Problems found:** all new tests passed on the first run, which by itself proves nothing. So six rules were broken on purpose (mutation check). All six made tests fail (`docs/evidence/02-mutation-check.txt`).
- **Verified:** `npx vitest run` → 49 passed (49).

## 7. 2026-11-08 · Claude Code · Task #05 metrics, screenshots, README
- **Output used:** before/after table, Playwright script driving Edge for 9 screenshots, README.
- **Problems found:** the first metrics table over-counted (said 11 F1–F5 tests, the real number is 9 + 1 catalog test; said 7 components, there are 6). Corrected after recounting the `it(` blocks and files.
- **Verified:** every number in the table comes from a command saved in `docs/evidence/`.

## Decisions I kept for myself
- Keep blocked rooms visible in the filtered list (with a *Blocked* badge) instead of hiding them: the user should see *why* a room they expect is not available, and F3 only forbids reporting it as available.
- Keep the original 30 tests instead of rewriting them.
- No new `SKILL.md` (the brief forbids it).

---

# AI-use record (Practice #11 – Explain availability)

**Assistant:** Claude (Claude Code session, Sonnet 5.5), working in a cloud checkout of this repo on branch `feat/week-11-tasks`. I gave the task PDF and the rules (work on a branch, mock first, tell me what is done); the assistant wrote code, tests and the report, and I reviewed the results.

## 12. 2026-11-21 · baseline and feature implementation
- **Prompt summary:** read the Practice #11 PDF, plan it, then implement tasks 01–05 with a mock LLM adapter.
- **Output used:** `src/ai/*`, `ExplainPanel`, additive `reasonCode` in `CheckResult`, tests, screenshots.
- **Problems found:** (1) timeout race – `abort()` before `resolve()` reported cause "error"; (2) the validator rejected its own mock templates ("00:00", example "09:00") and let `**bold**` through; (3) one UI-test typo. All caught by the new tests.
- **Verified:** `npm test` 49/49 before, 132/132 after this stage; typecheck, lint, build clean; real Chrome screenshots.

## 13. 2026-11-21 · agentic code review (separate read-only agent)
- **Prompt summary:** review `e833209..HEAD` against AC1–AC5, with README and AGENTS.md; evidence, severity, repro, minimal fix for each finding; no repository changes.
- **Output used:** 7 findings; all treated as hypotheses and reproduced with failing tests first.
- **Rejected / not acted on:** finding 5 (live provider fenced JSON) – plausible, not reproducible without an API key; findings 3, 6 and test gaps left as unresolved, listed in `docs/PRACTICE-11.md`.
- **Fixes applied:** A (output guard) and B (provider label). 149/149 tests afterwards.

## 14. Limits of the AI evidence
The three prompt samples in `docs/evidence/practice11/prompt-samples.json` were written by the assistant, not produced by a live API run.
