# Shared requirement and acceptance-criteria sheet (Practice #13)

This sheet is the same for the code-based and the low-code solution. The machine-readable copy
used by both is `practice13/shared/contract.json`.

## User story
As a student, I want to choose a future start time and a duration for **Library Study Room A**
so that I immediately see whether the room is **Available** or **Unavailable** and why,
without any booking being created or changed.

## Fixed data (fictional)
- Current time: **08:00** (fixed, so results are reproducible).
- Room: Library Study Room A. Existing bookings:

| ID | Title | Start | End |
|---|---|---|---|
| b1 | Physics Study Group | 09:00 | 10:00 |
| b2 | Robotics Club | 13:30 | 14:30 |
| b3 | Thesis Prep | 19:00 | 20:00 |

- No real personal data, no login, no payment, no production database.

## Inputs
| Input | Type | Notes |
|---|---|---|
| Start time | text `HH:MM` | today, 00:00–23:59 |
| Duration | whole minutes | text field, so 0, negative or non-numeric values can be typed and tested |
| Room status (blocked flag) | on/off | test control for AC4 |
| Bookings | fixed list above | read-only |

## Outputs
| Output | Values |
|---|---|
| `available` | `true` / `false` |
| `reasonCode` | `AVAILABLE`, `INVALID_TIME_FORMAT`, `INVALID_DURATION`, `OUT_OF_DAY_RANGE`, `START_IN_PAST`, `EXCEEDS_MAX_DURATION`, `ROOM_BLOCKED`, `OVERLAP` |
| Visible message | one plain-text sentence; shown together with *Available* / *Unavailable* |

Checks run in this order, and the first failing check decides:
`INVALID_TIME_FORMAT → INVALID_DURATION → OUT_OF_DAY_RANGE → START_IN_PAST → EXCEEDS_MAX_DURATION → ROOM_BLOCKED → OVERLAP → AVAILABLE`.
This is the order of the existing code-based rule engine; it was not changed for this practice.

## Acceptance criteria
| ID | Criterion | Reason code(s) |
|---|---|---|
| AC1 | Start time must be in the future (strictly after 08:00). | `START_IN_PAST` |
| AC2 | Duration must be greater than zero and at most 120 minutes. | `INVALID_DURATION`, `EXCEEDS_MAX_DURATION` |
| AC3 | Overlapping bookings are unavailable. Touching endpoints (e.g. 10:00 after a booking ending 10:00) do **not** overlap. | `OVERLAP` |
| AC4 | A blocked room is unavailable. | `ROOM_BLOCKED` |
| AC5 | A clear decision is displayed and existing bookings are never changed. | all |
| AC6 | Invalid input receives understandable feedback. | `INVALID_TIME_FORMAT`, `INVALID_DURATION`, `OUT_OF_DAY_RANGE` |

## Common test inputs (prepared before implementation)
| Test | Start | Duration | Blocked | Expected | Reason code | AC |
|---|---|---|---|---|---|---|
| T1 valid free interval | 10:30 | 60 | no | Available | `AVAILABLE` | AC5 |
| T2 overlap | 09:30 | 60 | no | Unavailable | `OVERLAP` | AC3 |
| T3 blocked room | 10:30 | 60 | yes | Unavailable | `ROOM_BLOCKED` | AC4 |
| T4 duration = 0 | 10:30 | 0 | no | validation error | `INVALID_DURATION` | AC2, AC6 |
| T5 duration = 121 | 10:30 | 121 | no | validation error | `EXCEEDS_MAX_DURATION` | AC2, AC6 |
| T6 past start time | 07:00 | 60 | no | validation error | `START_IN_PAST` | AC1, AC6 |
| T7 adjacent interval | 10:00 | 60 | no | Available | `AVAILABLE` | AC3 |
| T8 data unchanged | run T1–T7 | – | – | bookings identical before and after | – | AC5 |
