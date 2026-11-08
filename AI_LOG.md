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
