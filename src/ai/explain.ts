/**
 * "Explain availability" contract (Practice #11).
 *
 * Trust boundary: the deterministic checker decides availability. This module
 * only turns its structured result into a short sentence. Everything that
 * crosses the boundary (the request going out, the text coming back) is
 * treated as untrusted data and validated here.
 *
 * Relative imports only: this file is also used by the server handler.
 */
import type { CheckResult, ReasonCode, Room } from '../domain/types';
import { minutesToLabel } from '../domain/time';

export const MAX_ROOM_LABEL = 80;
export const MAX_EXPLANATION_CHARS = 300;
export const MAX_SENTENCES = 2;
export const DEFAULT_TIMEOUT_MS = 3000;

export const REASON_CODES: readonly ReasonCode[] = [
  'AVAILABLE',
  'NO_ROOM_SELECTED',
  'INVALID_TIME_FORMAT',
  'START_NOT_BEFORE_END',
  'OUT_OF_DAY_RANGE',
  'START_IN_PAST',
  'EXCEEDS_MAX_DURATION',
  'ROOM_BLOCKED',
  'OVERLAP',
];

/** Minimal context sent to the adapter. No booking titles, owners or user text. */
export interface ExplainInput {
  roomLabel: string;
  start: string | null; // "HH:MM" or null when the time was not valid
  end: string | null;
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export interface ExplainOutput {
  explanation: string;
}

export interface ExplainAdapter {
  /** Shown in the UI so a mock is never mistaken for a real model. */
  readonly label: string;
  readonly isMock: boolean;
  explain(input: ExplainInput, signal: AbortSignal): Promise<unknown>;
}

export type ExplainOutcome =
  | { kind: 'generated'; explanation: string }
  | { kind: 'fallback'; explanation: string; cause: 'timeout' | 'error' | 'invalid-output' }
  | { kind: 'rejected'; message: string };

type Validation<T> = { ok: true; value: T } | { ok: false; reason: string };

const TIME_RE = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const LABEL_RE = /^[\p{L}\p{N} .,'’·\-–()]+$/u;

/** Builds the minimal input from the checker's own result. */
export function buildExplainInput(
  room: Room,
  result: CheckResult,
  start: number | null,
  end: number | null
): ExplainInput {
  return {
    roomLabel: room.name,
    start: start === null ? null : minutesToLabel(start),
    end: end === null ? null : minutesToLabel(end),
    isAvailable: result.decision === 'available',
    reasonCode: result.code,
  };
}

/** AC3: reject empty, malformed or overly long input; also used server-side. */
export function validateExplainInput(raw: unknown): Validation<ExplainInput> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'Input must be an object.' };
  }
  const o = raw as Record<string, unknown>;

  if (typeof o.roomLabel !== 'string' || o.roomLabel.trim() === '') {
    return { ok: false, reason: 'roomLabel is required.' };
  }
  const roomLabel = o.roomLabel.trim();
  if (roomLabel.length > MAX_ROOM_LABEL) {
    return { ok: false, reason: `roomLabel is longer than ${MAX_ROOM_LABEL} characters.` };
  }
  if (!LABEL_RE.test(roomLabel)) {
    return { ok: false, reason: 'roomLabel contains unsupported characters.' };
  }

  if (typeof o.isAvailable !== 'boolean') {
    return { ok: false, reason: 'isAvailable must be a boolean.' };
  }
  if (typeof o.reasonCode !== 'string' || !REASON_CODES.includes(o.reasonCode as ReasonCode)) {
    return { ok: false, reason: 'reasonCode is not recognised.' };
  }
  const reasonCode = o.reasonCode as ReasonCode;
  if (o.isAvailable !== (reasonCode === 'AVAILABLE')) {
    return { ok: false, reason: 'isAvailable does not match reasonCode.' };
  }

  const times: Array<string | null> = [];
  for (const key of ['start', 'end'] as const) {
    const v = o[key];
    if (v === null || v === undefined) {
      times.push(null);
    } else if (typeof v === 'string' && TIME_RE.test(v)) {
      times.push(v);
    } else {
      return { ok: false, reason: `${key} must be HH:MM or null.` };
    }
  }
  if (reasonCode !== 'INVALID_TIME_FORMAT' && (times[0] === null || times[1] === null)) {
    return { ok: false, reason: 'start and end are required for this reasonCode.' };
  }

  return {
    ok: true,
    value: { roomLabel, start: times[0], end: times[1], isAvailable: o.isAvailable, reasonCode },
  };
}

// Wording that would contradict the checker's decision (AC2).
const CLAIMS_FREE =
  /\b(is free|is available|are available|you can book|can be booked|works for you|this time works)\b/i;
const CLAIMS_NOT_FREE =
  /\b(unavailable|not available|isn't available|not free|already booked|can't be booked|cannot be booked|blocked|overlap\w*|clash\w*)\b/i;

/** AC2: output must be plain, short, agree with the status and add no facts. */
export function validateExplainOutput(raw: unknown, input: ExplainInput): Validation<string> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'Output is not an object.' };
  }
  const text = (raw as Record<string, unknown>).explanation;
  if (typeof text !== 'string') return { ok: false, reason: 'explanation must be a string.' };

  const explanation = text.trim();
  if (explanation === '') return { ok: false, reason: 'explanation is empty.' };
  if (explanation.length > MAX_EXPLANATION_CHARS) {
    return { ok: false, reason: `explanation is longer than ${MAX_EXPLANATION_CHARS} characters.` };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f<>`{}[\]*#_~]|https?:|www\./i.test(explanation)) {
    return { ok: false, reason: 'explanation contains markup, links or control characters.' };
  }
  const sentences = explanation.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim() !== '');
  if (sentences.length > MAX_SENTENCES) {
    return { ok: false, reason: `explanation has more than ${MAX_SENTENCES} sentences.` };
  }

  // Invented details: any clock time must be one of the two requested times
  // (or a day boundary, which is a rule of the checker, not a booking detail).
  const allowed = new Set<string | null>([input.start, input.end, '00:00', '24:00']);
  for (const t of explanation.match(/\b\d{1,2}:\d{2}\b/g) ?? []) {
    if (!allowed.has(t)) return { ok: false, reason: `explanation mentions an unknown time (${t}).` };
  }

  // Must not override the deterministic status.
  if (input.isAvailable && CLAIMS_NOT_FREE.test(explanation)) {
    return { ok: false, reason: 'explanation contradicts an available result.' };
  }
  if (!input.isAvailable && CLAIMS_FREE.test(explanation)) {
    return { ok: false, reason: 'explanation contradicts an unavailable result.' };
  }
  return { ok: true, value: explanation };
}

/** Deterministic fallback (AC4): fixed text keyed by the checker's reason code. */
export function fallbackExplanation(input: ExplainInput): string {
  const base: Record<ReasonCode, string> = {
    AVAILABLE: 'The checker found no conflict for this room and time.',
    NO_ROOM_SELECTED: 'No room is selected.',
    INVALID_TIME_FORMAT: 'The times were not in HH:MM format.',
    START_NOT_BEFORE_END: 'The start time must be earlier than the end time.',
    OUT_OF_DAY_RANGE: 'Times must be between 00:00 and 24:00.',
    START_IN_PAST: 'The start time is not after the current time.',
    EXCEEDS_MAX_DURATION: 'The request is longer than the maximum booking length.',
    ROOM_BLOCKED: 'This room is blocked and cannot be booked.',
    OVERLAP: 'The requested time overlaps an existing booking.',
  };
  return base[input.reasonCode];
}

const TIMED_OUT = Symbol('timed-out');

/**
 * Validate input -> call adapter with a timeout -> validate output.
 * Never throws and never changes the availability decision.
 */
export async function explainAvailability(
  rawInput: unknown,
  adapter: ExplainAdapter,
  opts: { timeoutMs?: number } = {}
): Promise<ExplainOutcome> {
  const checked = validateExplainInput(rawInput);
  if (!checked.ok) return { kind: 'rejected', message: checked.reason };
  const input = checked.value;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      // Resolve first: aborting makes well-behaved adapters reject at once,
      // and that rejection must not win the race and be reported as "error".
      resolve(TIMED_OUT);
      controller.abort();
    }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  });

  try {
    const raw = await Promise.race([adapter.explain(input, controller.signal), timeout]);
    if (raw === TIMED_OUT) {
      return { kind: 'fallback', explanation: fallbackExplanation(input), cause: 'timeout' };
    }
    const output = validateExplainOutput(raw, input);
    if (!output.ok) {
      return { kind: 'fallback', explanation: fallbackExplanation(input), cause: 'invalid-output' };
    }
    return { kind: 'generated', explanation: output.value };
  } catch {
    return { kind: 'fallback', explanation: fallbackExplanation(input), cause: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
