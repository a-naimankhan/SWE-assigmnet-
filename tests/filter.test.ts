import { describe, it, expect } from 'vitest';
import {
  availableRooms,
  filterRooms,
  hasAllEquipment,
  hasCapacityFor,
  parseAttendees,
  NO_CRITERIA,
} from '@/domain/filter';
import { checkAvailability } from '@/domain/availability';
import { ROOMS } from '@/data/rooms';
import type { Room } from '@/domain/types';

// Isolated fixtures, independent from the demo catalog.
const roomA: Room = {
  id: 'A',
  name: 'Room A',
  building: 'Test',
  capacity: 10,
  equipment: ['projector', 'whiteboard'],
  blocked: false,
  bookings: [{ id: 'a1', title: 'A busy', start: 600, end: 660, owner: 't' }], // 10:00–11:00
};
const roomB: Room = {
  id: 'B',
  name: 'Room B',
  building: 'Test',
  capacity: 4,
  equipment: ['whiteboard'],
  blocked: false,
  bookings: [{ id: 'b1', title: 'B busy', start: 720, end: 780, owner: 't' }], // 12:00–13:00
};
const roomBlocked: Room = {
  id: 'X',
  name: 'Blocked Room',
  building: 'Test',
  capacity: 50,
  equipment: ['projector', 'whiteboard', 'video-conference', 'computers'],
  blocked: true,
  bookings: [],
};
const CATALOG: readonly Room[] = [roomA, roomB, roomBlocked];
const NOW = 480; // 08:00

describe('Catalog', () => {
  it('has at least four rooms, each with id, name, capacity, equipment, blocked status and bookings', () => {
    expect(ROOMS.length).toBeGreaterThanOrEqual(4);
    for (const r of ROOMS) {
      expect(r.id).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(typeof r.capacity).toBe('number');
      expect(Array.isArray(r.equipment)).toBe(true);
      expect(typeof r.blocked).toBe('boolean');
      expect(Array.isArray(r.bookings)).toBe(true);
    }
    expect(new Set(ROOMS.map((r) => r.id)).size).toBe(ROOMS.length);
  });
});

describe('F1 — Capacity filter (capacity >= attendees)', () => {
  it('keeps a room whose capacity is exactly the number of attendees', () => {
    expect(hasCapacityFor(roomA, 10)).toBe(true);
    expect(filterRooms(CATALOG, { attendees: 10, equipment: [] }).map((r) => r.id)).toContain('A');
  });

  it('drops a room whose capacity is one less than the attendees', () => {
    expect(hasCapacityFor(roomA, 11)).toBe(false);
    expect(filterRooms(CATALOG, { attendees: 11, equipment: [] }).map((r) => r.id)).toEqual(['X']);
  });

  it('applies no capacity limit when attendees is empty', () => {
    expect(filterRooms(CATALOG, NO_CRITERIA)).toHaveLength(3);
  });

  it('rejects zero, negative and fractional attendee input with a message', () => {
    expect(parseAttendees('')).toEqual({ ok: true, value: null });
    expect(parseAttendees('6')).toEqual({ ok: true, value: 6 });
    for (const bad of ['0', '-3', '2.5', 'abc']) {
      expect(parseAttendees(bad).ok).toBe(false);
    }
  });
});

describe('F2 — Equipment filter (ALL selected items required)', () => {
  it('excludes a room that has only part of the selected equipment', () => {
    expect(hasAllEquipment(roomB, ['projector', 'whiteboard'])).toBe(false);
    const ids = filterRooms(CATALOG, { attendees: null, equipment: ['projector', 'whiteboard'] }).map(
      (r) => r.id
    );
    expect(ids).toEqual(['A', 'X']);
  });

  it('combines capacity and equipment (both must hold)', () => {
    const ids = filterRooms(CATALOG, { attendees: 4, equipment: ['whiteboard'] }).map((r) => r.id);
    expect(ids).toEqual(['A', 'B', 'X']);
    expect(filterRooms(CATALOG, { attendees: 5, equipment: ['whiteboard'] }).map((r) => r.id)).toEqual([
      'A',
      'X',
    ]);
  });
});

describe('F3 — A blocked room is never reported as available', () => {
  it('omits a blocked room from available rooms even when it matches every filter', () => {
    const criteria = { attendees: 2, equipment: ['projector' as const] };
    expect(filterRooms(CATALOG, criteria).map((r) => r.id)).toContain('X');
    const free = availableRooms(CATALOG, criteria, 540, 600, NOW).map((r) => r.id);
    expect(free).not.toContain('X');
    expect(free).toEqual(['A']);
  });
});

describe('F4 — Empty result when nothing matches', () => {
  it('returns an empty list when no room satisfies the requirements', () => {
    expect(filterRooms(CATALOG, { attendees: 51, equipment: [] })).toEqual([]);
    expect(filterRooms(ROOMS, { attendees: 500, equipment: ['computers'] })).toEqual([]);
  });
});

describe('F5 — Availability uses the chosen room bookings', () => {
  it('gives different results for room A and room B for the same interval', () => {
    // 10:00–11:00 clashes with A's booking but not with B's
    const p = { start: 600, end: 660, currentTime: NOW };
    expect(checkAvailability(CATALOG, { ...p, roomId: 'A' }).decision).toBe('unavailable');
    expect(checkAvailability(CATALOG, { ...p, roomId: 'B' }).decision).toBe('available');
    // 12:00–13:00 is the opposite
    const q = { start: 720, end: 780, currentTime: NOW };
    expect(checkAvailability(CATALOG, { ...q, roomId: 'A' }).decision).toBe('available');
    expect(checkAvailability(CATALOG, { ...q, roomId: 'B' }).decision).toBe('unavailable');
  });
});

describe('AC5 — Filtering does not modify the catalog', () => {
  it('leaves rooms deep-equal and in the same order after filtering', () => {
    const before = structuredClone(CATALOG);
    filterRooms(CATALOG, { attendees: 5, equipment: ['whiteboard'] });
    availableRooms(CATALOG, { attendees: 1, equipment: [] }, 540, 600, NOW);
    expect(CATALOG).toEqual(before);
  });
});
