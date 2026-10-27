import { Booking, CheckResult, Room } from './types';

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
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function intervalsOverlap(a: Booking, start: number, end: number): boolean {
  // Touching endpoints are allowed: [540,600] and [600,660] do NOT overlap.
  return start < a.end && end > a.start;
}

export interface CheckParams {
  roomId: string;
  start: number;
  end: number;
  currentTime: number; // minutes from 00:00 today
}

export function checkAvailability(
  rooms: Room[],
  params: CheckParams
): CheckResult {
  const { roomId, start, end, currentTime } = params;
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { decision: 'unavailable', reason: 'Please select a room.' };
  }

  // AC1: validate interval bounds
  if (start < 0 || end > MINUTES_PER_DAY || start >= end) {
    return {
      decision: 'unavailable',
      reason: 'The start time must be earlier than the end time, and both must be between 00:00 and 24:00.',
    };
  }

  if (start <= currentTime) {
    return {
      decision: 'unavailable',
      reason: 'The start time must be after the current time.',
    };
  }

  // AC2: max duration
  if (end - start > MAX_BOOKING_MINUTES) {
    return {
      decision: 'unavailable',
      reason: `Bookings may not exceed ${MAX_BOOKING_MINUTES} minutes. This request is ${end - start} minutes.`,
    };
  }

  // AC3: blocked room
  if (room.blocked) {
    return {
      decision: 'unavailable',
      reason: `${room.name} is currently blocked and cannot be booked.`,
    };
  }

  // AC4: overlap with existing bookings
  const clash = room.bookings.find((b) => intervalsOverlap(b, start, end));
  if (clash) {
    return {
      decision: 'unavailable',
      reason: `Overlaps an existing booking: "${clash.title}" (${minutesToLabel(clash.start)}–${minutesToLabel(clash.end)}).`,
    };
  }

  return {
    decision: 'available',
    reason: `${room.name} is available ${minutesToLabel(start)}–${minutesToLabel(end)}.`,
  };
}
