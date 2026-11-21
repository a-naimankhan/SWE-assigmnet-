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

/** Returns the model's raw text for an already-validated input. */
export type ServerProvider = (input: ExplainInput, signal: AbortSignal) => Promise<string>;

export const mockProvider: ServerProvider = async (input) =>
  JSON.stringify({ explanation: mockExplanation(input) });

export function createAnthropicProvider(
  apiKey: string,
  opts: { model?: string; fetchImpl?: typeof fetch } = {}
): ServerProvider {
  const fetchImpl = opts.fetchImpl ?? ((...a) => fetch(...a));
  return async (input, signal) => {
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
}

export interface HandlerResult {
  status: number;
  body: { explanation: string } | { error: string };
}

export async function handleExplain(
  rawBody: string,
  provider: ServerProvider,
  timeoutMs = 2500
): Promise<HandlerResult> {
  if (rawBody.length > MAX_BODY_BYTES) return { status: 413, body: { error: 'Request too large.' } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'Invalid JSON.' } };
  }
  const input = validateExplainInput(parsed);
  if (!input.ok) return { status: 400, body: { error: input.reason } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const text = await provider(input.value, controller.signal);
    let model: unknown;
    try {
      model = JSON.parse(text);
    } catch {
      return { status: 502, body: { error: 'Model did not return JSON.' } };
    }
    const output = validateExplainOutput(model, input.value);
    if (!output.ok) return { status: 502, body: { error: 'Model output rejected.' } };
    return { status: 200, body: { explanation: output.value } };
  } catch {
    return { status: 502, body: { error: 'Provider unavailable.' } };
  } finally {
    clearTimeout(timer);
  }
}
