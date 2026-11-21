import type { ExplainInput } from './explain';

/**
 * Student-friendly sentences built only from the structured input.
 * Used by the mock adapter and by the server's mock provider, so the mock
 * demonstrates exactly the same contract a real model must follow.
 */
export function mockExplanation(input: ExplainInput): string {
  const { roomLabel: room, start: s, end: e } = input;
  switch (input.reasonCode) {
    case 'AVAILABLE':
      return `${room} is free from ${s} to ${e}, so this time works. This is only a check, so nothing has been reserved.`;
    case 'OVERLAP':
      return `${room} is not free from ${s} to ${e} because an existing booking covers part of that time. Try another time slot or another room.`;
    case 'ROOM_BLOCKED':
      return `${room} is currently closed for booking, so no time slot can be reserved there. Please choose a different room.`;
    case 'START_IN_PAST':
      return `The start time ${s} has already passed, so the request cannot be accepted. Pick a start time later than the current time.`;
    case 'EXCEEDS_MAX_DURATION':
      return `The request from ${s} to ${e} is longer than the 120-minute limit. Shorten it to two hours or less.`;
    case 'START_NOT_BEFORE_END':
      return `The start time ${s} must come before the end time ${e}. Swap or adjust the times and check again.`;
    case 'OUT_OF_DAY_RANGE':
      return 'The times must stay within one day, between 00:00 and 24:00. Adjust them and check again.';
    case 'INVALID_TIME_FORMAT':
      return 'One of the times is not in HH:MM format. Enter both times in HH:MM format and check again.';
    case 'NO_ROOM_SELECTED':
      return 'No room is selected yet. Pick a room first and check again.';
  }
}
