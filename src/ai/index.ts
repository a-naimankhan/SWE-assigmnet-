import type { ExplainAdapter } from './explain';
import { createMockAdapter } from './mockAdapter';
import { createHttpAdapter } from './httpAdapter';
import { createFaultyAdapter, type FaultMode } from './faults';

const FAULTS: readonly FaultMode[] = ['timeout', 'error', 'contradict', 'invented', 'long', 'malformed'];

/**
 * Default is the mock. `?llm=live` uses the server endpoint. Fault injection
 * (`?llm=timeout` etc.) is only honoured in dev builds.
 */
export function selectAdapter(search: string, isDev: boolean): ExplainAdapter {
  const mode = new URLSearchParams(search).get('llm');
  if (mode === 'live') return createHttpAdapter();
  if (isDev && mode && (FAULTS as readonly string[]).includes(mode)) {
    return createFaultyAdapter(mode as FaultMode);
  }
  return createMockAdapter();
}
