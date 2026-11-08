import type { Booking, CheckResult, Room } from './types';
import { minutesToLabel, validateInterval } from './time';

export function intervalsOverlap(a: Booking, start: number, end: number): boolean {
  // Touching endpoints are allowed: [540,600] and [600,660] do NOT overlap.
  return start < a.end && end > a.start;
}

export interface CheckParams {
  roomId: string;
  start: number | null; // null = empty or malformed time input
  end: number | null;
  currentTime: number; // minutes from 00:00 today
}

export function checkAvailability(
  rooms: Room[],
  params: CheckParams
): CheckResult {
  const { roomId, currentTime } = params;
  const room = rooms.find((r) => r.id === roomId);

  if (!room) {
    return { decision: 'unavailable', reason: 'Please select a room.' };
  }

  // AC1 + AC2: one shared validation rule
  const interval = validateInterval(params.start, params.end, currentTime);
  if (!interval.ok) {
    return { decision: 'unavailable', reason: interval.reason };
  }
  const { start, end } = interval;

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
