# AI-Driven Software Engineering – Practice #13 (Lesson #12)
## Code-based vs low-code: Smart Campus Room Availability Checker

Student : Naimankhan Aibar, 24B031919 · Group : Tuesday 16:00-19:00
AI tool : Claude Code (desktop app), model Claude Opus 5.5 (`claude-opus-5-5`)
Low-code platform : Appsmith Community Edition v2.7.2, self-hosted in Docker on `127.0.0.1:8080`
Repository : https://github.com/a-naimankhan/SWE-assigmnet- · branch `feat/assignment-week-13`
Live demo (code-based) : https://a-naimankhan.github.io/SWE-assigmnet-/#/single-room
Low-code export : `practice13/lowcode/appsmith-export.json` (no public link, see "Labels" below)

**Who did what.** The AI agent built both solutions, ran all tests and took the screenshots. I gave the task, picked the base branch, Appsmith and GitHub Pages, and switched on Pages in the repo settings. All times below are agent minutes.

### Labels (incomplete / simulated parts)
- Low-code app has **no public link**. It runs only on my machine (`127.0.0.1`). The export file and screenshots are the evidence.
- In Appsmith the widgets were dropped on the canvas with the editor's own drag-and-drop handler, but triggered from a script, because real mouse drag did not work in the automated browser. Widget names, labels, positions and bindings were then written in one request to Appsmith's page-layout API (the same JSON the editor saves). The JS Object was pasted into the JS editor. So the app is real and runs in Appsmith, but it was not "clicked together" by hand.
- Nothing else is simulated. T1–T8 were run in the deployed Appsmith app, not in the editor preview.

---

## Task #01 – Freeze the baseline
Base : `feat/assignment-5` @ `a77ebb0` (the final code-based checker from Assignment #05).

| Check | Result |
|---|---|
| `npm test` | 173 passed (9 files) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | no problems |
| `npm run build` | built, 175 kB JS |

Evidence : `docs/evidence/practice13/00-baseline.txt`, screenshot `code-00-baseline-catalog.png`.
Booking rules were not changed. The new code only calls the old `checkAvailability()`.

## Task #02 – Common contract
One sheet for both : `docs/PRACTICE-13-REQUIREMENTS.md`. Machine copy : `practice13/shared/contract.json`.

- Room : Library Study Room A. Bookings 09:00–10:00, 13:30–14:30, 19:00–20:00. Current time fixed 08:00.
- Inputs : start time `HH:MM`, duration in minutes, blocked flag, the 3 bookings.
- Outputs : `available` (true/false), `reasonCode`, one visible message.
- T1–T8 inputs were written into `contract.json` before any implementation. The code-based tests read cases straight from this file, so both tracks use the same inputs.

One addition : reason code `INVALID_DURATION`. The old app had start/end inputs, so duration 0 could not happen there. With a duration field it can.

## Task #03 – Code-based solution
- `src/domain/slot.ts` – `checkSlot()` turns (start, duration) into (start, end) and calls the existing `checkAvailability()`. Only new rule : duration must be a whole number > 0.
- `src/SingleRoomChecker.tsx` – page `#/single-room` : start time, duration, room status switch, result card with reason code, timeline, read-only booking list, preset buttons T1–T7.
- Validation / decision (domain, pure) are separate from display (React component). Data stays deep-frozen.
- 390 px : no horizontal scroll (`scrollWidth=390`), screenshot `code-mobile-390.png`.
- Tests : 206 passed (173 old + 33 new : `slot-contract.test.ts`, `slot.ui.test.tsx`).
- Live demo built by GitHub Actions (`.github/workflows/pages.yml`). Tests, typecheck and lint must pass before deploy. Screenshot `code-live-github-pages.png`.

## Task #04 – Low-code solution (Appsmith)
- Widgets : `StartTime`, `Duration` (Input), `Blocked` (Switch), `CheckBtn` (Button, onClick `{{Checker.check()}}`), `ResultText`, `MessageText` (Text), `BookingsTable` (Table bound to `{{Checker.bookings}}`).
- Script : one JS Object `Checker` (~60 lines, `practice13/lowcode/Checker.jsobject.js`). It was needed. Overlap, "after 08:00" and the check order cannot be done with property expressions in a readable way.
- Same 3 bookings, same messages, same check order as the contract.

Requirements the platform could not do (or not well) :
- No unit tests inside Appsmith. Only manual or browser-script runs.
- Bookings in the JS Object are a normal array. Any other JS in the app could change it. In the code version they are frozen.
- At 390 px labels and button text are cut ("Start time (HH:…", "Check avail…") and the table scrolls inside its box. The page itself has no horizontal scroll (`scrollWidth=390`). See `lowcode-mobile-390.png`.
- Version control : only manual export to JSON. Appsmith's "Connect Git" needs a remote repo and was not set up.

Screenshots : `lowcode-01-editor-canvas.png`, `lowcode-02-editor-button-onclick.png`, `lowcode-03-editor-js-object.png`.

## Task #05 – Identical tests (T1–T8)
Both tracks : same inputs from `contract.json`, current time 08:00.

| Test | Input | Expected | Code-based observed | Low-code observed |
|---|---|---|---|---|
| T1 free interval | 10:30, 60 | Available `AVAILABLE` | Available `AVAILABLE` | Available `AVAILABLE` |
| T2 overlap | 09:30, 60 | Unavailable `OVERLAP` | Unavailable `OVERLAP` ("Physics Study Group" 09:00–10:00) | same |
| T3 blocked | 10:30, 60, blocked | Unavailable `ROOM_BLOCKED` | Unavailable `ROOM_BLOCKED` | same |
| T4 duration 0 | 10:30, 0 | error `INVALID_DURATION` | `INVALID_DURATION` | `INVALID_DURATION` |
| T5 duration 121 | 10:30, 121 | error `EXCEEDS_MAX_DURATION` | "…This request is 121 minutes." | same |
| T6 past start | 07:00, 60 | error `START_IN_PAST` | `START_IN_PAST` | `START_IN_PAST` |
| T7 adjacent | 10:00, 60 | Available `AVAILABLE` | Available 10:00–11:00 | Available 10:00–11:00 |
| T8 data unchanged | after T1–T7 | bookings same | same text before/after + `Object.isFrozen` true | table text same before/after |
| **Passed** | | | **8/8** | **8/8** |

Raw output : `docs/evidence/practice13/02-code-ui-run.tsv`, `04-lowcode-ui-run.tsv`. Screenshots : `code-T1…T8.png`, `lowcode-T1…T8.png`.
T8 is weaker on the low-code side. It only shows the table did not change. It can't show the data is protected.

## Task #06 – Engineering effort
Measured from `date` stamps and commit times (`docs/evidence/practice13/03-effort.md`). Agent minutes.

| Phase | Code-based | Low-code |
|---|---|---|
| Setup | ~1 min | ~7 min (3.66 GB image, 1 failed pull, 1 failed container start, 2 failed sign-ups) |
| Implementation | ~2 min | ~4 min |
| Debugging | ~1 min (3 issues : 2 TypeScript errors, 1 lint warning) | ~1 min (JS Object must start with `export default`) |
| Testing | ~2 min | ~6 min (test script failed 2 times on Appsmith overlays/timeouts) |
| Total | ~6 min | ~17 min |
| Acceptance tests | 8/8 | 8/8 |
| Unresolved defects | 0 | 0 (3 weaknesses listed in Task #04) |

Measured vs impression :
- Measured : low-code took ~3x longer here. Most of it was setup and test automation, not building the screen.
- Impression (not measured) : for a person clicking by hand Appsmith would probably be faster to a first screen. The code version was fast only because the rule engine already existed.

Review and versioning :
- Code : every change is a small commit (`git log --oneline a77ebb0..feat/assignment-week-13`), diff review, tests in CI before deploy.
- Low-code : changes live inside Appsmith's MongoDB. Review = look in editor. Version = manual JSON export committed to git. That export is 1 834 lines, mostly widget defaults, so a diff of it is hard to review.

## Task #07 – Security review (Lecture #12)

| Check | Code-based | Low-code (Appsmith) |
|---|---|---|
| XSS in inputs | `<img onerror>`, `<script>`, `<svg onload>` in both fields → `INVALID_DURATION` / `INVALID_TIME_FORMAT`, 0 injected elements, 0 alerts. React escapes text, no `innerHTML` / `dangerouslySetInnerHTML` in `src/` | same payloads → same codes, 0 injected elements, 0 alerts. Text widget shows them as text |
| Injection | no DB, no queries. `"60; DROP TABLE bookings"`, `"1' OR '1'='1"` → `INVALID_DURATION` | no datasource, no queries. Same input rejected by the JS Object |
| Secrets | none in `dist/` (grep `ANTHROPIC`, `sk-ant`, `api_key` → 0). No `.env` tracked | export JSON scanned : 0 e-mails, 0 passwords. Admin login only in git-ignored `appsmith-local.env` |
| Permissions / sharing | public static site, read-only, no login needed (nothing to protect) | app is private : anonymous visit → redirect to `/user/login` (`lowcode-anonymous-access.png`). Not shared publicly |
| Exposure | Pages = HTTPS. Dev server listens on `[::1]` only | container bound to `127.0.0.1:8080` only. Product-update e-mails unticked at sign-up |
| SCA (dependencies) | `npm audit --omit=dev` → 0. With dev tools : 23 (2 low, 7 moderate, 11 high, 3 critical), all in build/test tools, not in the bundle | I can't audit Appsmith's own dependencies. Updating = pulling a new image. Platform patches are Appsmith's job, applying them is mine |
| Connectors / AI agents | GitHub Pages workflow has only `pages: write`, `id-token: write`, `contents: read` | no connectors, no datasources. The AI agent had admin rights in Appsmith : least privilege was not applied here |
| DAST scope | only my local dev server and my own Pages site | only my local Appsmith. No scans of third-party services |

Evidence : `docs/evidence/practice13/05-security-code.txt`, `04-lowcode-ui-run.tsv` (probe lines).

## Comparison matrix

| Criterion | Code-based | Low-code (Appsmith) |
|---|---|---|
| Functional tests | 8 / 8 | 8 / 8 |
| Build and repair time | ~6 min (agent) | ~17 min (agent) |
| Customization | full : own components, timeline, presets, 390 px layout without cut text | widget set only, layout grid; text cut at 390 px; logic still needs a JS Object |
| Security controls | escaped output, frozen data, audit in CI, no secrets, loopback dev server | platform escapes text, private by default, login required; platform patches depend on vendor image; agent used admin |
| Versioning / portability | git, small commits, tests in CI, static build runs anywhere | manual JSON export, big noisy diffs, runs only in Appsmith |
| Ongoing cost | 0 (GitHub Pages, public repo) | 0 self-hosted, but someone must run and update a 3.66 GB container. Cloud plan prices not checked |

## Recommendation
Code-based, for this project. The rule engine already exists and has 206 tests. The code version passes the same 8 cases, works on a phone and every change is reviewable in git. Appsmith also passed 8/8. It is a fair choice for a quick internal admin screen where nobody needs unit tests or a public link, but here it only copies logic we already have.

## AI-use reflection
- Prompt (translated from Russian) : "create a new branch from feat/assignmnet 12 … plan what to do for this assignment … write everything into feat/assignment-week-13, save all screenshots and wait for my command before push". The agent asked 3 questions first (base branch, low-code platform, live demo) because the branch name did not exist.
- Useful : it kept one contract file for both tracks, so the cases could not drift. It reused `checkAvailability()` instead of writing new rules.
- Mistakes the agent made and fixed : 2 TypeScript errors in its own tests; Appsmith JS Object with a comment before `export default`; a sed edit that deleted the button click from its test script (found because the screenshots showed "Press Check availability"); first sign-up used a `.test` e-mail that Appsmith rejects.
- What I did myself : switched on GitHub Pages (Source = GitHub Actions, branch rule for `feat/assignment-week-13`) and sent the live link. The other numbers come from the evidence files. I still have to re-run `npm test` myself before the defense.
