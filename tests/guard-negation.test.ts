/**
 * Mitigation M1 (risk R-02): the output guard must not let a negation word that
 * belongs to another clause "cancel" a claim that contradicts the checker.
 */
import { describe, expect, it } from 'vitest';
import { validateExplainOutput, type ExplainInput } from '../src/ai/explain';

const base = { roomLabel: 'Library Study Room A', start: '09:00', end: '10:00' };
const unavailable: ExplainInput = { ...base, isAvailable: false, reasonCode: 'OVERLAP' };
const available: ExplainInput = { ...base, isAvailable: true, reasonCode: 'AVAILABLE' };
const verdict = (text: string, input: ExplainInput) =>
  validateExplainOutput({ explanation: text }, input).ok;

describe('negation must be local to the claim it negates', () => {
  it.each([
    'Nothing blocks you, go ahead and book it.',
    'No problem so go ahead and book it.',
    'There is no issue, you can book it.',
    'Never mind the booking, the room is free from 09:00 to 10:00.',
  ])('rejects a contradiction of an unavailable result: %s', (text) => {
    expect(verdict(text, unavailable)).toBe(false);
  });

  it.each([
    'No worries, the room is booked from 09:00 to 10:00.',
    'Nothing to fear, it is taken.',
  ])('rejects a contradiction of an available result: %s', (text) => {
    expect(verdict(text, available)).toBe(false);
  });

  it.each([
    ['Library Study Room A is not free from 09:00 to 10:00.', unavailable],
    ['The room is no longer available for that time.', unavailable],
    ['The room is not currently available.', unavailable],
    ['Library Study Room A is not booked from 09:00 to 10:00.', available],
    ['No conflict was found for 09:00 to 10:00.', available],
    ['The time is free, without any overlap.', available],
  ] as const)('still accepts a correctly negated statement: %s', (text, input) => {
    expect(verdict(text, input)).toBe(true);
  });
});
