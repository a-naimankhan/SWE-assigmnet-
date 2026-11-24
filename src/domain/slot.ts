/**
 * Practice #13 shared contract: start time + duration for ONE room.
 *
 * This is an adapter over the existing rules, not a new rule engine:
 * it converts (start, duration) into (start, end) and calls
 * checkAvailability(), so the code-based solution keeps exactly the
 * same booking rules as before. The only addition is INVALID_DURATION,
 * because a duration input can be 0, negative or fractional, which the
 * start/end UI could not express.
 */
import type { Booking, ReasonCode, Room } from './types';
import { checkAvailability } from './availability';
import { labelToMinutes } from './time';

export type SlotReasonCode = ReasonCode | 'INVALID_DURATION';

export interface SlotRequest {
  readonly startTime: string; // "HH:MM"
  readonly durationMinutes: number | null; // null = empty input
  readonly roomName: string;
  readonly roomBlocked: boolean;
  readonly bookings: readonly Booking[];
  readonly currentTime: number; // minutes from 00:00
}

export interface SlotDecision {
  readonly available: boolean;
  readonly reasonCode: SlotReasonCode;
  readonly message: string;
}

export const INVALID_DURATION_MESSAGE =
  'Duration must be a whole number of minutes greater than 0.';

/** Parses the duration text field. Empty or non-numeric text -> null. */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export function checkSlot(req: SlotRequest): SlotDecision {
  const start = labelToMinutes(req.startTime);
  if (start === null) {
    return {
      available: false,
      reasonCode: 'INVALID_TIME_FORMAT',
      message: 'Please enter a valid start time in HH:MM format.',
    };
  }

  const d = req.durationMinutes;
  if (d === null || !Number.isInteger(d) || d <= 0) {
    return { available: false, reasonCode: 'INVALID_DURATION', message: INVALID_DURATION_MESSAGE };
  }

  // Reuse the existing engine unchanged: one temporary read-only room.
  const room: Room = {
    id: 'slot-room',
    name: req.roomName,
    building: '',
    capacity: 0,
    equipment: [],
    blocked: req.roomBlocked,
    bookings: req.bookings,
  };
  const result = checkAvailability([room], {
    roomId: room.id,
    start,
    end: start + d,
    currentTime: req.currentTime,
  });

  return {
    available: result.decision === 'available',
    reasonCode: result.code,
    message: result.reason,
  };
}
