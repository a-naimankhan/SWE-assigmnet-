// All domain data is read-only (AC5): availability checks and filters
// return new values and never modify rooms or bookings.

export interface Booking {
  readonly id: string;
  readonly title: string;
  readonly start: number; // minutes from 00:00
  readonly end: number; // minutes from 00:00
  readonly owner: string;
}

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly building: string;
  readonly capacity: number;
  readonly blocked: boolean;
  readonly bookings: readonly Booking[];
}

export interface CheckResult {
  readonly decision: 'available' | 'unavailable';
  readonly reason: string;
}
