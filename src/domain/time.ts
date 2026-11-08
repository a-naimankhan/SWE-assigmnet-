/** Time rules and conversions (AC1, AC2). Pure functions, no DOM. */

export const MINUTES_PER_DAY = 1440;
export const MAX_BOOKING_MINUTES = 120;

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hh = h.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function labelToMinutes(label: string): number | null {
  const match = /^([0-9]{2}):([0-9]{2})$/.exec(label);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  if (h > 23 || m > 59) return null;

  return h * 60 + m;
}

export type IntervalCheck =
  | { ok: true; start: number; end: number }
  | { ok: false; reason: string };

/** True when both ends are known and 0 <= start < end <= 24:00. */
export function isWellFormedInterval(
  start: number | null,
  end: number | null
): boolean {
  return durationOf(start, end) !== null;
}

/** Length of a well-formed interval in minutes, otherwise null. */
export function durationOf(start: number | null, end: number | null): number | null {
  if (start === null || end === null) return null;
  if (start < 0 || end > MINUTES_PER_DAY || start >= end) return null;
  return end - start;
}

/** AC2: true when a known duration is longer than the allowed maximum. */
export function exceedsMaxDuration(duration: number | null): boolean {
  return duration !== null && duration > MAX_BOOKING_MINUTES;
}

/**
 * Single source of truth for AC1 (valid time) and AC2 (120-minute maximum).
 * Used by checkAvailability() and, through durationOf/isWellFormedInterval,
 * by the UI hints, so the hint and the decision can never disagree.
 */
export function validateInterval(
  start: number | null,
  end: number | null,
  currentTime: number
): IntervalCheck {
  if (start === null || end === null) {
    return { ok: false, reason: 'Please enter valid times in HH:MM format.' };
  }
  if (start >= end) {
    return { ok: false, reason: 'The start time must be earlier than the end time.' };
  }
  if (start < 0 || end > MINUTES_PER_DAY) {
    return { ok: false, reason: 'Times must be between 00:00 and 24:00.' };
  }
  if (start <= currentTime) {
    return { ok: false, reason: 'The start time must be after the current time.' };
  }
  const duration = end - start;
  if (exceedsMaxDuration(duration)) {
    return {
      ok: false,
      reason: `Bookings may not exceed ${MAX_BOOKING_MINUTES} minutes. This request is ${duration} minutes.`,
    };
  }
  return { ok: true, start, end };
}
