import { describe, it, expect } from 'vitest';
import {
  MAX_EXPLANATION_CHARS,
  MAX_ROOM_LABEL,
  REASON_CODES,
  buildExplainInput,
  explainAvailability,
  fallbackExplanation,
  validateExplainInput,
  validateExplainOutput,
  type ExplainAdapter,
  type ExplainInput,
} from '@/ai/explain';
import { createMockAdapter } from '@/ai/mockAdapter';
import { createFaultyAdapter, type FaultMode } from '@/ai/faults';
import { createHttpAdapter } from '@/ai/httpAdapter';
import { mockExplanation } from '@/ai/templates';
import { selectAdapter } from '@/ai';
import { PROMPTS } from '@/ai/prompts';
import {
  MAX_BODY_BYTES,
  createAnthropicProvider,
  handleExplain,
  mockProvider,
} from '@/ai/serverHandler';
import { checkAvailability } from '@/domain/availability';
import { ROOMS } from '@/data/rooms';

const NOW = 480;
const available: ExplainInput = {
  roomLabel: 'Engineering Lab 3', start: '09:00', end: '10:00', isAvailable: true, reasonCode: 'AVAILABLE',
};
const overlap: ExplainInput = {
  roomLabel: 'Library Study Room A', start: '09:00', end: '10:00', isAvailable: false, reasonCode: 'OVERLAP',
};

/** One representative input per reason code. */
function inputFor(code: (typeof REASON_CODES)[number]): ExplainInput {
  const times = { start: '09:00', end: '10:00' };
  if (code === 'INVALID_TIME_FORMAT') return { roomLabel: 'Quiet Pod 4', start: null, end: null, isAvailable: false, reasonCode: code };
  if (code === 'NO_ROOM_SELECTED') return { roomLabel: 'Quiet Pod 4', ...times, isAvailable: false, reasonCode: code };
  return { roomLabel: 'Quiet Pod 4', ...times, isAvailable: code === 'AVAILABLE', reasonCode: code };
}

describe('checker still decides (AC1) and now exposes a reason code', () => {
  const run = (roomId: string, start: number | null, end: number | null) =>
    checkAvailability(ROOMS, { roomId, start, end, currentTime: NOW });

  it.each([
    ['r2', 540, 600, 'available', 'AVAILABLE'],
    ['r1', 540, 600, 'unavailable', 'OVERLAP'],
    ['r3', 600, 660, 'unavailable', 'ROOM_BLOCKED'],
    ['r1', null, 600, 'unavailable', 'INVALID_TIME_FORMAT'],
    ['r1', 600, 540, 'unavailable', 'START_NOT_BEFORE_END'],
    ['r1', 420, 480, 'unavailable', 'START_IN_PAST'],
    ['r1', 600, 780, 'unavailable', 'EXCEEDS_MAX_DURATION'],
    ['missing', 600, 660, 'unavailable', 'NO_ROOM_SELECTED'],
  ] as const)('%s %i-%i -> %s / %s', (room, s, e, decision, code) => {
    const r = run(room, s, e);
    expect(r.decision).toBe(decision);
    expect(r.code).toBe(code);
  });

  it('buildExplainInput carries only label, times, status and code (no booking details)', () => {
    const result = run('r1', 540, 600);
    const input = buildExplainInput(ROOMS[0], result, 540, 600);
    expect(input).toEqual(overlap);
    expect(JSON.stringify(input)).not.toMatch(/Physics|Chen/);
  });
});

describe('input validation (AC3)', () => {
  it('accepts a valid input and trims the label', () => {
    const r = validateExplainInput({ ...available, roomLabel: '  Engineering Lab 3 ' });
    expect(r).toEqual({ ok: true, value: available });
  });

  it.each([
    ['null', null],
    ['array', []],
    ['string', 'hello'],
    ['empty label', { ...available, roomLabel: '' }],
    ['blank label', { ...available, roomLabel: '   ' }],
    ['non-string label', { ...available, roomLabel: 42 }],
    [`label over ${MAX_ROOM_LABEL}`, { ...available, roomLabel: 'A'.repeat(MAX_ROOM_LABEL + 1) }],
    ['markup in label', { ...available, roomLabel: '<script>alert(1)</script>' }],
    ['malformed start', { ...available, start: '9:00' }],
    ['malformed end', { ...available, end: '25:99' }],
    ['unknown reason code', { ...available, reasonCode: 'ALL_GOOD' }],
    ['status contradicts code', { ...available, isAvailable: false }],
    ['non-boolean status', { ...available, isAvailable: 'true' }],
    ['missing times for AVAILABLE', { ...available, start: null }],
  ])('rejects %s', (_name, raw) => {
    expect(validateExplainInput(raw).ok).toBe(false);
  });

  it('allows null times only for INVALID_TIME_FORMAT, and 24:00 as an end', () => {
    expect(validateExplainInput(inputFor('INVALID_TIME_FORMAT')).ok).toBe(true);
    expect(validateExplainInput({ ...available, end: '24:00' }).ok).toBe(true);
  });
});

describe('output validation (AC2)', () => {
  const ok = (text: string, input = available) => validateExplainOutput({ explanation: text }, input).ok;

  it('accepts every mock template for every reason code', () => {
    for (const code of REASON_CODES) {
      const input = inputFor(code);
      const res = validateExplainOutput({ explanation: mockExplanation(input) }, input);
      expect(res, code).toEqual({ ok: true, value: mockExplanation(input) });
    }
  });

  it('accepts a fitting model sentence', () => {
    expect(ok('Engineering Lab 3 is free from 09:00 to 10:00, so you can go ahead.')).toBe(true);
  });

  it.each([
    ['not an object', 'text'],
    ['wrong key', { text: 'x' }],
    ['non-string', { explanation: 5 }],
    ['empty', { explanation: '   ' }],
    ['too long', { explanation: 'a'.repeat(MAX_EXPLANATION_CHARS + 1) }],
    ['markdown', { explanation: 'It is **free**.' }],
    ['link', { explanation: 'See https://evil.example now.' }],
    ['html', { explanation: 'Free <b>now</b>.' }],
    ['three sentences', { explanation: 'It is free. Go ahead. Have fun.' }],
    ['unknown time', { explanation: 'It is free until 17:30.' }],
    ['says unavailable for an available result', { explanation: 'The room is unavailable then.' }],
    ['says blocked for an available result', { explanation: 'That room is blocked.' }],
  ])('rejects %s (available result)', (_n, raw) => {
    expect(validateExplainOutput(raw, available).ok).toBe(false);
  });

  it.each([
    ['says it is available', 'The room is available, you can book it.'],
    ['says it is free', 'The room is free at that time.'],
  ])('rejects text that %s for an unavailable result', (_n, text) => {
    expect(validateExplainOutput({ explanation: text }, overlap).ok).toBe(false);
  });

  it('does not treat "not free" as a claim that the room is free', () => {
    expect(ok('The room is not free from 09:00 to 10:00.', overlap)).toBe(true);
  });
});

describe('explainAvailability: failure handling (AC4)', () => {
  it('returns generated text from the mock adapter', async () => {
    const out = await explainAvailability(available, createMockAdapter(0));
    expect(out.kind).toBe('generated');
    expect(out.kind === 'generated' && out.explanation).toBe(mockExplanation(available));
  });

  it('rejects invalid input without calling the adapter', async () => {
    let called = false;
    const spy: ExplainAdapter = { label: 'spy', isMock: true, explain: async () => { called = true; return {}; } };
    const out = await explainAvailability({ ...available, roomLabel: '' }, spy);
    expect(out.kind).toBe('rejected');
    expect(called).toBe(false);
  });

  it('times out slow adapters and falls back', async () => {
    const t0 = Date.now();
    const out = await explainAvailability(overlap, createFaultyAdapter('timeout'), { timeoutMs: 30 });
    expect(out).toEqual({ kind: 'fallback', cause: 'timeout', explanation: fallbackExplanation(overlap) });
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('aborts the adapter signal on timeout', async () => {
    let aborted = false;
    const adapter: ExplainAdapter = {
      label: 'x', isMock: true,
      explain: (_i, signal) => new Promise((_, rej) => signal.addEventListener('abort', () => { aborted = true; rej(new Error('abort')); })),
    };
    await explainAvailability(overlap, adapter, { timeoutMs: 10 });
    expect(aborted).toBe(true);
  });

  it.each<[FaultMode, 'error' | 'invalid-output']>([
    ['error', 'error'],
    ['contradict', 'invalid-output'],
    ['invented', 'invalid-output'],
    ['long', 'invalid-output'],
    ['malformed', 'invalid-output'],
  ])('fault "%s" -> fallback (%s) for available and unavailable results', async (mode, cause) => {
    for (const input of [available, overlap]) {
      const out = await explainAvailability(input, createFaultyAdapter(mode));
      expect(out).toEqual({ kind: 'fallback', cause, explanation: fallbackExplanation(input) });
    }
  });

  it('every fallback text is itself valid and consistent with the status', () => {
    for (const code of REASON_CODES) {
      const input = inputFor(code);
      expect(validateExplainOutput({ explanation: fallbackExplanation(input) }, input).ok, code).toBe(true);
    }
  });
});

describe('adapter selection', () => {
  it('defaults to the labelled mock', () => {
    const a = selectAdapter('', false);
    expect(a.isMock).toBe(true);
    expect(a.label).toMatch(/mock/i);
  });
  it('honours ?llm=live but only honours fault injection in dev', () => {
    expect(selectAdapter('?llm=live', false).isMock).toBe(false);
    expect(selectAdapter('?llm=timeout', false).label).toMatch(/mock/i);
    expect(selectAdapter('?llm=timeout', true).label).toMatch(/timeout/);
  });
});

describe('http adapter and server handler', () => {
  it('http adapter posts JSON and surfaces non-2xx as an error', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchOk = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ explanation: 'ok' }), { status: 200 });
    }) as unknown as typeof fetch;
    const raw = await createHttpAdapter('/api/explain', fetchOk).explain(available, new AbortController().signal);
    expect(raw).toEqual({ explanation: 'ok' });
    expect(JSON.parse(calls[0].body)).toEqual(available);

    const fetch500 = (async () => new Response('x', { status: 500 })) as unknown as typeof fetch;
    const out = await explainAvailability(available, createHttpAdapter('/api/explain', fetch500));
    expect(out.kind === 'fallback' && out.cause).toBe('error');
  });

  it('server returns a validated explanation from the mock provider', async () => {
    const res = await handleExplain(JSON.stringify(overlap), mockProvider);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ explanation: mockExplanation(overlap) });
  });

  it.each([
    ['invalid JSON', '{nope', 400],
    ['invalid input', JSON.stringify({ roomLabel: '' }), 400],
    ['oversized body', 'x'.repeat(MAX_BODY_BYTES + 1), 413],
  ])('server rejects %s', async (_n, body, status) => {
    expect((await handleExplain(body, mockProvider)).status).toBe(status);
  });

  it('server rejects bad model output and provider failures with 502', async () => {
    const body = JSON.stringify(overlap);
    expect((await handleExplain(body, async () => 'not json')).status).toBe(502);
    expect((await handleExplain(body, async () => JSON.stringify({ explanation: 'The room is available.' }))).status).toBe(502);
    expect((await handleExplain(body, async () => { throw new Error('boom'); })).status).toBe(502);
  });

  it('server aborts a hanging provider after its timeout', async () => {
    const hang = (_i: ExplainInput, signal: AbortSignal) =>
      new Promise<string>((_, rej) => signal.addEventListener('abort', () => rej(new Error('abort'))));
    const res = await handleExplain(JSON.stringify(overlap), hang, 20);
    expect(res.status).toBe(502);
  });

  it('Anthropic provider sends the key only in a header and the structured JSON as user content', async () => {
    let seen: { headers: Record<string, string>; body: { system: string; messages: Array<{ content: string }> } } | null = null;
    const fakeFetch = (async (_u: string, init: RequestInit) => {
      seen = { headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ content: [{ type: 'text', text: '{"explanation":"x"}' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const text = await createAnthropicProvider('sk-test', { fetchImpl: fakeFetch })(overlap, new AbortController().signal);
    expect(text).toBe('{"explanation":"x"}');
    expect(seen!.headers['x-api-key']).toBe('sk-test');
    expect(JSON.stringify(seen!.body)).not.toContain('sk-test');
    expect(JSON.parse(seen!.body.messages[0].content)).toEqual(overlap);
    expect(seen!.body.system).toBe(PROMPTS.p3);
  });
});
