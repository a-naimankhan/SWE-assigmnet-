import type { Booking, CheckResult, Room } from './types';
import { MAX_BOOKING_MINUTES, MINUTES_PER_DAY, minutesToLabel } from './time';

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

  if (start >= end) {
    return {
      decision: 'unavailable',
      reason: 'The start time must be earlier than the end time.',
    };
  }

  if (start < 0 || end > MINUTES_PER_DAY) {
    return {
      decision: 'unavailable',
      reason: 'Times must be between 00:00 and 24:00.',
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
