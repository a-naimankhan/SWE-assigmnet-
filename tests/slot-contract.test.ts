/**
 * Practice #13 Task #05: the eight shared cases T1–T8, read from the same
 * JSON file the low-code solution uses (practice13/shared/contract.json).
 */
import { describe, expect, it } from 'vitest';
import contract from '../practice13/shared/contract.json';
import { ROOMS } from '@/data/rooms';
import { checkSlot, parseDuration, type SlotDecision } from '@/domain/slot';
import { labelToMinutes } from '@/domain/time';

const room = ROOMS.find((r) => r.id === contract.room.id)!;
const NOW = labelToMinutes(contract.currentTime)!;

type Case = (typeof contract.cases)[number];
const decisionCases = contract.cases.filter(
  (c): c is Case & { startTime: string; durationMinutes: number; roomBlocked: boolean } =>
    'startTime' in c
);

function run(c: (typeof decisionCases)[number]): SlotDecision {
  return checkSlot({
    startTime: c.startTime,
    durationMinutes: c.durationMinutes,
    roomName: room.name,
    roomBlocked: c.roomBlocked,
    bookings: room.bookings,
    currentTime: NOW,
  });
}

describe('shared contract data', () => {
  it('uses the same bookings as the code-based catalog room', () => {
    const fromJson = contract.room.bookings.map((b) => ({
      id: b.id,
      title: b.title,
      start: labelToMinutes(b.start),
      end: labelToMinutes(b.end),
    }));
    const fromCatalog = room.bookings.map(({ id, title, start, end }) => ({ id, title, start, end }));
    expect(fromJson).toEqual(fromCatalog);
  });
});

describe('Practice #13 T1–T8 (code-based)', () => {
  it.each(decisionCases.map((c) => [c.id, c.title, c] as const))('%s %s', (_id, _t, c) => {
    const d = run(c);
    expect(d.reasonCode).toBe(c.expected.reasonCode);
    expect(d.available).toBe(c.expected.available);
    expect(d.message.length).toBeGreaterThan(0);
  });

  it('T8 booking data unchanged after all checks', () => {
    const before = JSON.stringify(room.bookings);
    decisionCases.forEach(run);
    expect(JSON.stringify(room.bookings)).toBe(before);
    expect(Object.isFrozen(room.bookings)).toBe(true);
    expect(room.bookings.every((b) => Object.isFrozen(b))).toBe(true);
  });
});

describe('checkSlot edge cases', () => {
  const base = {
    startTime: '10:30',
    roomName: room.name,
    roomBlocked: false,
    bookings: room.bookings,
    currentTime: NOW,
  };

  it.each<[number | null, string]>([
    [null, 'empty'],
    [-15, 'negative'],
    [30.5, 'fractional'],
  ])('duration %s (%s) -> INVALID_DURATION', (durationMinutes) => {
    expect(checkSlot({ ...base, durationMinutes }).reasonCode).toBe('INVALID_DURATION');
  });

  it('120 minutes is the maximum that is still accepted', () => {
    expect(checkSlot({ ...base, durationMinutes: 120 }).reasonCode).toBe('AVAILABLE');
  });

  it('malformed start time -> INVALID_TIME_FORMAT', () => {
    expect(checkSlot({ ...base, startTime: '9:3', durationMinutes: 30 }).reasonCode).toBe(
      'INVALID_TIME_FORMAT'
    );
  });

  it('interval past midnight -> OUT_OF_DAY_RANGE', () => {
    expect(checkSlot({ ...base, startTime: '23:30', durationMinutes: 60 }).reasonCode).toBe(
      'OUT_OF_DAY_RANGE'
    );
  });

  it('start equal to the current time counts as past (AC1)', () => {
    expect(checkSlot({ ...base, startTime: '08:00', durationMinutes: 30 }).reasonCode).toBe(
      'START_IN_PAST'
    );
  });

  it('message is plain text: HTML-like input is never echoed back', () => {
    const d = checkSlot({ ...base, startTime: '<img src=x onerror=alert(1)>', durationMinutes: 30 });
    expect(d.reasonCode).toBe('INVALID_TIME_FORMAT');
    expect(d.message).not.toContain('<');
  });

  it.each([
    ['60', 60],
    [' 45 ', 45],
    ['', null],
    ['abc', null],
    ['1e3', null],
    ['0', 0],
  ])('parseDuration(%j) -> %s', (text, expected) => {
    expect(parseDuration(text)).toBe(expected);
  });
});
