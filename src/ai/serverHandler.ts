/**
 * Server-side half of the adapter (framework-agnostic: works behind Vite,
 * Express, or a Go/Java service that re-implements the same contract).
 * Holds the API key, re-validates input and output, never trusts the client.
 */
import {
  type ExplainInput,
  validateExplainInput,
  validateExplainOutput,
} from './explain';
import { mockExplanation } from './templates';
import { ACTIVE_PROMPT, PROMPTS, buildUserMessage } from './prompts';

export const MAX_BODY_BYTES = 2048;

const encoder = new TextEncoder();

/** Real UTF-8 size. `String.length` counts UTF-16 units and undercounts non-ASCII text. */
export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Collects request-body chunks as bytes and decodes once at the end, so a
 * multi-byte character split across two chunks is not corrupted, and enforces
 * the limit in bytes. `push` returns false as soon as the limit is exceeded.
 */
export function createBodyCollector(limitBytes = MAX_BODY_BYTES) {
  const chunks: Uint8Array[] = [];
  let size = 0;
  return {
    push(chunk: Uint8Array | string): boolean {
      const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
      size += bytes.byteLength;
      if (size > limitBytes) return false;
      chunks.push(bytes);
      return true;
    },
    text(): string {
      const all = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        all.set(c, offset);
        offset += c.byteLength;
      }
      return new TextDecoder().decode(all);
    },
  };
}

/**
 * Fixed-window limiter per client key. Protects the (paid) provider behind
 * /api/explain from being called without bound. In memory, per process.
 */
export function createRateLimiter(
  opts: { max?: number; windowMs?: number; maxKeys?: number; now?: () => number } = {}
) {
  const { max = 20, windowMs = 60_000, maxKeys = 1000, now = Date.now } = opts;
  const hits = new Map<string, { start: number; count: number }>();
  return {
    allow(key: string): boolean {
      const t = now();
      const entry = hits.get(key);
      if (!entry || t - entry.start >= windowMs) {
        if (!entry && hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
        hits.set(key, { start: t, count: 1 });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
  };
}

export interface HandleOptions {
  /** When set, only these room labels are accepted (the catalog names). */
  allowedLabels?: ReadonlySet<string>;
}

/** `complete` returns the model's raw text for an already-validated input. */
export interface ServerProvider {
  /** Reported to the client so a mock is never presented as a live model. */
  readonly kind: 'mock' | 'live';
  complete(input: ExplainInput, signal: AbortSignal): Promise<string>;
}

export const mockProvider: ServerProvider = {
  kind: 'mock',
  complete: async (input) => JSON.stringify({ explanation: mockExplanation(input) }),
};

export function createAnthropicProvider(
  apiKey: string,
  opts: { model?: string; fetchImpl?: typeof fetch } = {}
): ServerProvider {
  const fetchImpl = opts.fetchImpl ?? ((...a) => fetch(...a));
  const complete: ServerProvider['complete'] = async (input, signal) => {
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.model ?? 'claude-haiku-5-5',
        max_tokens: 150,
        system: PROMPTS[ACTIVE_PROMPT],
        messages: [{ role: 'user', content: buildUserMessage(input) }],
      }),
    });
    if (!res.ok) throw new Error(`Provider HTTP ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    return data.content?.find((c) => c.type === 'text')?.text ?? '';
  };
  return { kind: 'live', complete };
}

export interface HandlerResult {
  status: number;
  body: { explanation: string; provider: 'mock' | 'live' } | { error: string };
}

export async function handleExplain(
  rawBody: string,
  provider: ServerProvider,
  timeoutMs = 2500,
  options: HandleOptions = {}
): Promise<HandlerResult> {
  if (byteLength(rawBody) > MAX_BODY_BYTES) return { status: 413, body: { error: 'Request too large.' } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'Invalid JSON.' } };
  }
  const input = validateExplainInput(parsed);
  if (!input.ok) return { status: 400, body: { error: input.reason } };
  // The label goes into the model prompt: only known room names may reach it.
  if (options.allowedLabels && !options.allowedLabels.has(input.value.roomLabel)) {
    return { status: 400, body: { error: 'Unknown room.' } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const text = await provider.complete(input.value, controller.signal);
    let model: unknown;
    try {
      model = JSON.parse(text);
    } catch {
      return { status: 502, body: { error: 'Model did not return JSON.' } };
    }
    const output = validateExplainOutput(model, input.value);
    if (!output.ok) return { status: 502, body: { error: 'Model output rejected.' } };
    return { status: 200, body: { explanation: output.value, provider: provider.kind } };
  } catch {
    return { status: 502, body: { error: 'Provider unavailable.' } };
  } finally {
    clearTimeout(timer);
  }
}
