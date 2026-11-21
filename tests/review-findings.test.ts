import { describe, it, expect } from 'vitest';
import { explainAvailability, validateExplainOutput, type ExplainAdapter, type ExplainInput } from '@/ai/explain';
import { handleExplain, mockProvider } from '@/ai/serverHandler';
import { createHttpAdapter } from '@/ai/httpAdapter';

/** Regression tests for the confirmed findings of the agentic review (Practice #11, Task #07). */
const available: ExplainInput = {
  roomLabel: 'Engineering Lab 3', start: '09:00', end: '10:00', isAvailable: true, reasonCode: 'AVAILABLE',
};
const overlap: ExplainInput = {
  roomLabel: 'Library Study Room A', start: '09:00', end: '10:00', isAvailable: false, reasonCode: 'OVERLAP',
};
const verdict = (text: string, input: ExplainInput) => validateExplainOutput({ explanation: text }, input).ok;

describe('Finding 1: output guard must reject contradictions and invented details (AC2)', () => {
  it.each([
    ['occupied', 'Engineering Lab 3 is occupied from 09:00 to 10:00.', available],
    ['booked by a person', 'Engineering Lab 3 is booked by Dr Kim from 09:00 to 10:00', available],
    ['says free + go ahead', "Library Study Room A: it's free from 09:00 to 10:00, go ahead and book it", overlap],
    ['open and vacant', 'The room is open and vacant from 09:00 to 10:00.', overlap],
    ['invented person (Prof)', 'Library Study Room A is held by Prof Chen from 09:00 to 10:00. Try another room.', overlap],
    ['invented person (Dr, no time)', 'Library Study Room A is not free. Dr. Kim has it.', overlap],
    ['invented room and number', 'Library Study Room A is not free, try Room 305 which seats 40.', overlap],
    ['invented room letter', 'Library Study Room A is not free, try Room B instead.', overlap],
  ])('rejects: %s', (_n, text, input) => {
    expect(verdict(text, input)).toBe(false);
  });

  it('still accepts every honest wording used by the mock, fallback and prompt samples', () => {
    expect(verdict('Engineering Lab 3 is free from 09:00 to 10:00, so this time works. This is only a check, so nothing has been reserved.', available)).toBe(true);
    expect(verdict('Enter both times in HH:MM format and check again.', { ...overlap, reasonCode: 'INVALID_TIME_FORMAT', start: null, end: null })).toBe(true);
  });
});

describe('Finding 4: negated wording is legitimate, not a contradiction', () => {
  it.each([
    'Engineering Lab 3 has no overlap from 09:00 to 10:00.',
    'There is no clash from 09:00 to 10:00.',
    'Engineering Lab 3 is available from 09:00 to 10:00 because no other booking overlaps that time.',
    'Engineering Lab 3 is not blocked and has no conflict from 09:00 to 10:00.',
  ])('accepts for an available result: %s', (text) => {
    expect(verdict(text, available)).toBe(true);
  });

  it('still rejects a positive claim of a clash for an available result', () => {
    expect(verdict('Engineering Lab 3 has an overlap from 09:00 to 10:00.', available)).toBe(false);
  });
});

describe('Finding 2: mock text must never be labelled as AI-generated (AC5)', () => {
  it('server states which provider produced the text', async () => {
    const res = await handleExplain(JSON.stringify(overlap), mockProvider);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ provider: 'mock' });
  });

  const fetchWith = (provider: unknown) =>
    (async () => new Response(JSON.stringify({ explanation: 'Library Study Room A is not free from 09:00 to 10:00.', provider }), { status: 200 })) as unknown as typeof fetch;
  const run = (adapter: ExplainAdapter) => explainAvailability(overlap, adapter);

  it('outcome carries provider=mock when the server used the mock', async () => {
    const out = await run(createHttpAdapter('/api/explain', fetchWith('mock')));
    expect(out).toMatchObject({ kind: 'generated', provider: 'mock' });
  });

  it('only provider=live counts as AI-generated; missing or unknown is treated as mock', async () => {
    expect(await run(createHttpAdapter('/api/explain', fetchWith('live')))).toMatchObject({ provider: 'live' });
    expect(await run(createHttpAdapter('/api/explain', fetchWith(undefined)))).toMatchObject({ provider: 'mock' });
    expect(await run(createHttpAdapter('/api/explain', fetchWith('gpt-9')))).toMatchObject({ provider: 'mock' });
  });
});
