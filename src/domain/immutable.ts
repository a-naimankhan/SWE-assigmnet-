/**
 * Recursively freezes an object graph (AC5).
 * A plain Object.freeze() is shallow: Object.freeze(ROOMS) would still allow
 * ROOMS[0].bookings.push(...). deepFreeze also freezes every nested room,
 * booking and array.
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}
