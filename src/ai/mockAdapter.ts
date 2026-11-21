import { MOCK_LABEL, type ExplainAdapter } from './explain';
import { mockExplanation } from './templates';

/** Clearly labelled mock: no network, no key, deterministic output. */
export function createMockAdapter(latencyMs = 250): ExplainAdapter {
  return {
    label: MOCK_LABEL,
    isMock: true,
    explain(input, signal) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => resolve({ explanation: mockExplanation(input) }),
          latencyMs
        );
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    },
  };
}
