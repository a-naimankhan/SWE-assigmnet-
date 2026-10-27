import { describe, it, expect } from 'vitest';
import {
  MAX_BOOKING_MINUTES,
  MINUTES_PER_DAY,
  checkAvailability,
  intervalsOverlap,
  labelToMinutes,
  minutesToLabel,
  type CheckParams,
} from '@/lib/availability';
import { ROOMS } from '@/lib/data';
import type { Booking, Room } from '@/lib/types';

// ---------------------------------------------------------------------------
// Test helpers / fixtures
// ---------------------------------------------------------------------------

/**
 * Build a minimal, isolated room with a known schedule so that tests are not
 * coupled to the contents of src/lib/data.ts.
 */
function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'test-room',
    name: 'Test Room',
    building: 'Test Building',
    capacity: 10,
    blocked: false,
    bookings: [],
    ...overrides,
  };
}

/** A booking from 10:00 (600) to 11:00 (660). */
const BOOKING_10_11: Booking = {
  id: 'existing-1',
  title: 'Existing Booking',
  start: 600,
  end: 660,
  owner: 'Tester',
};

/** Build CheckParams with sensible defaults for the isolated room. */
function params(
  overrides: Partial<CheckParams> & { room?: Room } = {}
): { rooms: Room[]; params: CheckParams } {
  const room = overrides.room ?? makeRoom({ bookings: [BOOKING_10_11] });
  const { room: _omit, ...rest } = overrides;
  void _omit;
  return {
    rooms: [room],
    params: {
      roomId: room.id,
      start: 540, // 09:00
      end: 600, // 10:00 (touches the existing booking, no overlap)
      currentTime: 480, // 08:00
      ...rest,
    },
  };
}

// ---------------------------------------------------------------------------
// AC1 — Overlap & boundary logic
// ---------------------------------------------------------------------------

describe('AC1 — Overlap & boundary logic', () => {
  describe('intervalsOverlap (pure boundary helper)', () => {
    const existing: Booking = { ...BOOKING_10_11 };

    it('T01: rejects a fully-contained overlap', () => {
      expect(intervalsOverlap(existing, 610, 650)).toBe(true);
    });

    it('T02: rejects a partial overlap on the leading edge', () => {
      expect(intervalsOverlap(existing, 590, 620)).toBe(true);
    });

    it('T03: rejects a partial overlap on the trailing edge', () => {
      expect(intervalsOverlap(existing, 650, 700)).toBe(true);
    });

    it('T04: allows a booking that ends exactly when the existing one starts (touching)', () => {
      // request 09:00–10:00, existing 10:00–11:00 -> no overlap
      expect(intervalsOverlap(existing, 540, 600)).toBe(false);
    });

    it('T05: allows a booking that starts exactly when the existing one ends (touching)', () => {
    // request 11:00–12: 00, existing 10:00–11:00 -> no overlap
      expect(intervalsOverlap(existing, 660, 720)).toBe(false);
    });

    it('T06: allows a booking entirely before the existing one', () => {
      expect(intervalsOverlap(existing, 480, 540)).toBe(false);
    });

    it('T07: allows a booking entirely after the existing one', () => {
      expect(intervalsOverlap(existing, 720, 780)).toBe(false);
    });

    it('T08: rejects an identical-time overlap (duplicate constraint)', () => {
      expect(intervalsOverlap(existing, 600, 660)).toBe(true);
    });
  });

  describe('checkAvailability boundary reflection', () => {
    it('T09: marks a touching booking as Available', () => {
      const { rooms, params: p } = params({ start: 540, end: 600 });
      const res = checkAvailability(rooms, p);
      expect(res.decision).toBe('available');
      expect(res.reason).toContain('available');
    });

    it('T10: marks an overlapping booking as Unavailable and names the clash', () => {
      const { rooms, params: p } = params({ start: 630, end: 700 });
      const res = checkAvailability(rooms, p);
      expect(res.decision).toBe('unavailable');
      expect(res.reason).toContain('Overlaps an existing booking');
      expect(res.reason).toContain('Existing Booking');
    });
  });
});

// ---------------------------------------------------------------------------
// AC2 — State & status validation (Available / Booked reflections)
// ---------------------------------------------------------------------------

describe('AC2 — State & status validation', () => {
  it('T11: returns a clear Available status with the room name and interval', () => {
    const room = makeRoom({ bookings: [] });
    const { rooms, params: p } = params({ room, start: 540, end: 600 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('available');
    expect(res.reason).toBe('Test Room is available 09:00–10:00.');
  });

  it('T12: returns a clear Booked (unavailable) status when the room is blocked', () => {
    const room = makeRoom({ blocked: true });
    const { rooms, params: p } = params({ room, start: 540, end: 600 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toBe('Test Room is currently blocked and cannot be booked.');
  });

  it('T13: returns a clear Booked (unavailable) status when overlapping a real booking', () => {
    const { rooms, params: p } = params({ start: 610, end: 650 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toMatch(/Overlaps an existing booking/);
  });

  it('reflects Available for the sample Library Study Room A on a free slot', () => {
    const res = checkAvailability(ROOMS, {
      roomId: 'r1',
      start: 700, // 11:40 — between Physics Study Group (540–600) and Robotics Club (810–870)
      end: 750, // 12:30
      currentTime: 480,
    });
    expect(res.decision).toBe('available');
    expect(res.reason).toContain('Library Study Room A');
  });

  it('reflects Unavailable for the blocked Design Studio 2 regardless of time', () => {
    const res = checkAvailability(ROOMS, {
      roomId: 'r3',
      start: 540,
      end: 600,
      currentTime: 0,
    });
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('blocked');
  });
});

// ---------------------------------------------------------------------------
// AC3 — Edge cases: invalid ranges, missing fields, duplicate constraints
// ---------------------------------------------------------------------------

describe('AC3 — Edge cases', () => {
  it('T14: rejects when start equals end (zero-length interval)', () => {
    const { rooms, params: p } = params({ start: 600, end: 600 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('start time must be earlier than the end time');
  });

  it('rejects when start is after end (inverted range)', () => {
    const { rooms, params: p } = params({ start: 700, end: 650 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('start time must be earlier than the end time');
  });

  it('rejects an end time beyond 24:00 (MINUTES_PER_DAY boundary)', () => {
    const { rooms, params: p } = params({ start: 1430, end: MINUTES_PER_DAY + 10 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('between 00:00 and 24:00');
  });

  it('rejects a start time before 00:00 (negative boundary)', () => {
    const { rooms, params: p } = params({ start: -10, end: 60 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('between 00:00 and 24:00');
  });

  it('rejects when start is not strictly after the current time', () => {
    const { rooms, params: p } = params({ start: 480, end: 540, currentTime: 480 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('start time must be after the current time');
  });

  it('rejects when the candidate starts in the past (before current time)', () => {
    const { rooms, params: p } = params({ start: 300, end: 360, currentTime: 400 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('start time must be after the current time');
  });

  it(`rejects a duration exceeding the ${MAX_BOOKING_MINUTES}-minute limit`, () => {
    const { rooms, params: p } = params({
      start: 540,
      end: 540 + MAX_BOOKING_MINUTES + 10,
      currentTime: 480,
    });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain(`may not exceed ${MAX_BOOKING_MINUTES} minutes`);
  });

  it(`accepts a duration exactly equal to the ${MAX_BOOKING_MINUTES}-minute limit`, () => {
    const room = makeRoom({ bookings: [] });
    const { rooms, params: p } = params({
      room,
      start: 540,
      end: 540 + MAX_BOOKING_MINUTES,
      currentTime: 480,
    });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('available');
  });

  it('rejects when the room id does not exist (missing field / bad reference)', () => {
    const res = checkAvailability(ROOMS, {
      roomId: 'does-not-exist',
      start: 540,
      end: 600,
      currentTime: 480,
    });
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toBe('Please select a room.');
  });

  it('rejects a duplicate booking that exactly matches an existing one', () => {
    const { rooms, params: p } = params({ start: 600, end: 660 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('Overlaps an existing booking');
    expect(res.reason).toContain('10:00–11:00');
  });

  it('rejects a booking that fully envelops an existing one', () => {
    // 09:40–11:20 (100 min, within the limit) fully contains 10:00–11:00.
    const { rooms, params: p } = params({ start: 580, end: 680 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('Overlaps an existing booking');
  });

  it('rejects a booking fully contained inside an existing one', () => {
    const { rooms, params: p } = params({ start: 610, end: 650 });
    const res = checkAvailability(rooms, p);
    expect(res.decision).toBe('unavailable');
    expect(res.reason).toContain('Overlaps an existing booking');
  });
});

// ---------------------------------------------------------------------------
// Pure-utility coverage: time label <-> minutes conversions
// ---------------------------------------------------------------------------

describe('time conversion utilities', () => {
  it('converts minutes to HH:MM labels correctly', () => {
    expect(minutesToLabel(0)).toBe('00:00');
    expect(minutesToLabel(540)).toBe('09:00');
    expect(minutesToLabel(600)).toBe('10:00');
    expect(minutesToLabel(MINUTES_PER_DAY)).toBe('24:00');
  });

  it('converts valid HH:MM labels to minutes', () => {
    expect(labelToMinutes('00:00')).toBe(0);
    expect(labelToMinutes('09:00')).toBe(540);
    expect(labelToMinutes('23:59')).toBe(1439);
  });

  it('rejects malformed or out-of-range time labels', () => {
    expect(labelToMinutes('9:00')).toBeNull();
    expect(labelToMinutes('09')).toBeNull();
    expect(labelToMinutes('24:00')).toBeNull(); // hour 24 invalid in HH:MM
    expect(labelToMinutes('12:60')).toBeNull();
    expect(labelToMinutes('abc')).toBeNull();
    expect(labelToMinutes('')).toBeNull();
  });
});
