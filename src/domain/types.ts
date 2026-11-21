// All domain data is read-only (AC5): availability checks and filters
// return new values and never modify rooms or bookings.

export interface Booking {
  readonly id: string;
  readonly title: string;
  readonly start: number; // minutes from 00:00
  readonly end: number; // minutes from 00:00
  readonly owner: string;
}

export type Equipment = 'projector' | 'whiteboard' | 'video-conference' | 'computers';

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly building: string;
  readonly capacity: number;
  readonly equipment: readonly Equipment[];
  readonly blocked: boolean;
  readonly bookings: readonly Booking[];
}

/**
 * Machine-readable outcome of the deterministic checker. The text in
 * `reason` is for people; `code` is what other code (e.g. the optional
 * AI explanation) may rely on. Added in Practice #11, additive only.
 */
export type ReasonCode =
  | 'AVAILABLE'
  | 'NO_ROOM_SELECTED'
  | 'INVALID_TIME_FORMAT'
  | 'START_NOT_BEFORE_END'
  | 'OUT_OF_DAY_RANGE'
  | 'START_IN_PAST'
  | 'EXCEEDS_MAX_DURATION'
  | 'ROOM_BLOCKED'
  | 'OVERLAP';

export interface CheckResult {
  readonly decision: 'available' | 'unavailable';
  readonly reason: string;
  readonly code: ReasonCode;
}
