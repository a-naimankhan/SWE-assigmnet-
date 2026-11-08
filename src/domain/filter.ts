/** Room filtering rules (F1–F3). Pure functions: inputs are never modified. */
import type { Equipment, Room } from './types';
import { checkAvailability } from './availability';

export const EQUIPMENT_OPTIONS: readonly { id: Equipment; label: string }[] = [
  { id: 'projector', label: 'Projector' },
  { id: 'whiteboard', label: 'Whiteboard' },
  { id: 'video-conference', label: 'Video conference' },
  { id: 'computers', label: 'Computers' },
];

export function equipmentLabel(id: Equipment): string {
  return EQUIPMENT_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export interface RoomCriteria {
  /** Requested attendees; null = no capacity requirement. */
  readonly attendees: number | null;
  /** Every item listed here must be present in the room. */
  readonly equipment: readonly Equipment[];
}

export const NO_CRITERIA: RoomCriteria = { attendees: null, equipment: [] };

/** F1: capacity must be greater than or equal to the requested attendees. */
export function hasCapacityFor(room: Room, attendees: number | null): boolean {
  return attendees === null || room.capacity >= attendees;
}

/** F2: the room must contain ALL required items. */
export function hasAllEquipment(room: Room, required: readonly Equipment[]): boolean {
  return required.every((item) => room.equipment.includes(item));
}

/** Rooms satisfying the user's requirements (F1 + F2), in catalog order. */
export function filterRooms(rooms: readonly Room[], criteria: RoomCriteria): Room[] {
  return rooms.filter(
    (room) =>
      hasCapacityFor(room, criteria.attendees) &&
      hasAllEquipment(room, criteria.equipment)
  );
}

/**
 * Matching rooms that are actually free for the interval. Uses the same
 * checkAvailability() rule per room, so a blocked room is never reported as
 * available (F3) and each room is checked against ITS OWN bookings.
 */
export function availableRooms(
  rooms: readonly Room[],
  criteria: RoomCriteria,
  start: number | null,
  end: number | null,
  currentTime: number
): Room[] {
  return filterRooms(rooms, criteria).filter(
    (room) =>
      checkAvailability(rooms, { roomId: room.id, start, end, currentTime })
        .decision === 'available'
  );
}

export type AttendeesInput =
  | { readonly ok: true; readonly value: number | null }
  | { readonly ok: false; readonly reason: string };

/** Parses the attendees field. Empty = no capacity requirement. */
export function parseAttendees(raw: string): AttendeesInput {
  if (raw.trim() === '') return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, reason: 'Attendees must be a whole number of 1 or more.' };
  }
  return { ok: true, value: n };
}
