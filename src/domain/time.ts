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
