# Effort measurement (Task #06)

Source: `date` stamps written during the work (`03-timelog-raw.txt`), test-runner start times and commit times (`git log --date=format:%H:%M:%S`).
All work was done by the AI agent (Claude Code), so these are agent wall-clock minutes, not my own build time.
Idle time (waiting for me, Docker stopped) is not counted and is listed separately.

## Code-based (React + TypeScript, existing repo)
| Phase | From → to | Minutes | What happened |
|---|---|---|---|
| Setup | 18:22:16 → 18:22:40 | ~1 | branch, `npm test` 173/173, typecheck, lint, build |
| Implementation | 18:23 → 18:24:59 | ~2 | `contract.json`, `domain/slot.ts`, `SingleRoomChecker.tsx`, 2 test files |
| Debugging | 18:24:59 → ~18:25:40 | ~1 | 3 issues: TS2345 in `it.each` typing, TS2459 wrong import path, react-refresh lint warning in `main.tsx` |
| Testing | ~18:25:40 → 18:27:30 | ~2 | 206/206 tests, browser check, T1–T8 screenshot run |
| **Total** | | **~6** | + ~1 min Pages workflow, ~2 min security evidence |

## Low-code (Appsmith CE, self-hosted in Docker)
| Phase | From → to | Minutes | What happened |
|---|---|---|---|
| Setup | 18:27:36 → 18:31:00, 19:39:30 → 19:43:02 | ~7 | 3.66 GB image (first pull failed `unexpected EOF`); first container start failed (Caddy TLS error) → recreated with a fresh volume; admin sign-up failed twice (form values not registered, `.test` e-mail rejected) |
| Implementation | 19:43:02 → 19:47:01 | ~4 | 7 widgets, JS Object `Checker`, bindings, deploy |
| Debugging | inside the 4 min | ~1 | "JSObject must start with 'export default'" (comment before it), `Checker.result is undefined` until the JS Object parsed |
| Testing | 19:47:01 → 19:53:11 | ~6 | 3 runs of the test script: `networkidle` timeout in editor, button click intercepted by overlay; 3rd run 8/8 |
| **Total** | | **~17** | |
| Idle (not counted) | 18:31 → 19:39 | 68 | session paused, Docker Desktop stopped the container |

## Defects
| | Code-based | Low-code |
|---|---|---|
| Acceptance tests passed | 8/8 | 8/8 |
| Unresolved functional defects | 0 | 0 |
| Known weaknesses | none found in T1–T8 | labels/button text cut at 390 px, bookings array in JS Object is not frozen (T8 checked only through the UI), no automated tests, no CI |
