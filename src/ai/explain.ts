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
export const MOCK_LABEL = 'Mock explanation (demo mode, no AI model used)';

/**
 * Compile-time exhaustive: adding a member to `ReasonCode` without listing it
 * here is a type error, so the server can never reject a code the checker
 * produces. REASON_CODES is derived from this map (single place to edit).
 */
const REASON_CODE_MAP: Record<ReasonCode, true> = {
  AVAILABLE: true,
  NO_ROOM_SELECTED: true,
  INVALID_TIME_FORMAT: true,
  START_NOT_BEFORE_END: true,
  OUT_OF_DAY_RANGE: true,
  START_IN_PAST: true,
  EXCEEDS_MAX_DURATION: true,
  ROOM_BLOCKED: true,
  OVERLAP: true,
};

export const REASON_CODES = Object.keys(REASON_CODE_MAP) as readonly ReasonCode[];

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

/** Who produced the text. Anything not proven to be a live model counts as mock. */
export type ExplainProvider = 'mock' | 'live';

export type ExplainOutcome =
  | { kind: 'generated'; explanation: string; provider: ExplainProvider }
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

// Wording that would contradict the checker's decision (AC2). This is a
// heuristic guard, not proof: the real guarantee is that the status shown to
// the user always comes from the checker, never from this text.
const CLAIMS_FREE =
  /\b(?:free|vacant|open|empty|available|go ahead|works for you|this time works|you can (?:book|reserve|use)|can be booked)\b/gi;
const CLAIMS_NOT_FREE =
  /\b(?:unavailable|booked|occupied|taken|reserved|busy|held|closed|blocked|conflicts?|overlap\w*|clash\w*)\b/gi;
const NEGATION = /\b(?:no|not|without|never|nothing|nor|none)\b|n't\b/i;
const TITLES = /^(?:dr|prof|professor|mr|mrs|ms|miss|mx)\.?$/i;

/** True when `pattern` matches a claim that is not negated within the 4 preceding words. */
function hasPositiveClaim(text: string, pattern: RegExp): boolean {
  for (const m of text.matchAll(pattern)) {
    const before = text.slice(0, m.index).split(/\s+/).slice(-4).join(' ');
    if (!NEGATION.test(before)) return true;
  }
  return false;
}

/** Names, titles, extra rooms or numbers that are not in the supplied facts. */
function inventedEntity(text: string, input: ExplainInput): string | null {
  const known = new Set(input.roomLabel.toLowerCase().split(/\s+/));

  const withoutKnownNumbers = text.replace(/\b\d{1,2}:\d{2}\b/g, ' ').replace(/\b120\b/g, ' ');
  for (const n of withoutKnownNumbers.match(/\d+/g) ?? []) {
    if (!known.has(n)) return `the number ${n}`;
  }

  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}:]+$/gu, '');
    if (!w) continue;
    if (TITLES.test(w)) return `the title ${w}`;
    if (!/^\p{Lu}/u.test(w) || w === 'HH:MM' || w === 'I') continue;
    if (known.has(w.toLowerCase())) continue;
    const startsSentence = i === 0 || /[.!?:]$/.test(tokens[i - 1]);
    if (!startsSentence) return `the name ${w}`;
  }
  return null;
}

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
  const invented = inventedEntity(explanation, input);
  if (invented) return { ok: false, reason: `explanation mentions ${invented}, which was not supplied.` };

  // Must not override the deterministic status.
  if (input.isAvailable && hasPositiveClaim(explanation, CLAIMS_NOT_FREE)) {
    return { ok: false, reason: 'explanation contradicts an available result.' };
  }
  if (!input.isAvailable && hasPositiveClaim(explanation, CLAIMS_FREE)) {
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
    // Fail-safe: only a live model, as reported by the server, may be called AI-generated.
    const reported = (raw as Record<string, unknown>).provider;
    const provider: ExplainProvider = reported === 'live' && !adapter.isMock ? 'live' : 'mock';
    return { kind: 'generated', explanation: output.value, provider };
  } catch {
    return { kind: 'fallback', explanation: fallbackExplanation(input), cause: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
