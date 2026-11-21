import type { ExplainAdapter, ExplainInput } from './explain';
import { mockExplanation } from './templates';

export type FaultMode = 'timeout' | 'error' | 'contradict' | 'invented' | 'long' | 'malformed';

/**
 * Misbehaving adapters for tests and for demos in dev (`?llm=<mode>`).
 * They exist to prove AC2 and AC4: whatever the model does, the UI keeps the
 * checker's decision and shows a safe fallback.
 */
export function createFaultyAdapter(mode: FaultMode): ExplainAdapter {
  const respond = (input: ExplainInput, signal: AbortSignal): Promise<unknown> => {
    switch (mode) {
      case 'timeout':
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        );
      case 'error':
        return Promise.reject(new Error('Simulated provider failure (HTTP 500)'));
      case 'contradict':
        return Promise.resolve({
          explanation: input.isAvailable
            ? `${input.roomLabel} is blocked and already booked at that time.`
            : `${input.roomLabel} is available, you can book it.`,
        });
      case 'invented':
        return Promise.resolve({
          explanation: `${mockExplanation(input)} Dr. Kim has it from 07:15.`,
        });
      case 'long':
        return Promise.resolve({ explanation: 'Very long. '.repeat(100) });
      case 'malformed':
        return Promise.resolve({ text: 'wrong shape' });
    }
  };
  return { label: `Fault injection: ${mode}`, isMock: true, explain: respond };
}
