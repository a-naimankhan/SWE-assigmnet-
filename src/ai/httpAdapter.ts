import type { ExplainAdapter } from './explain';

/** Browser side of the server adapter. The API key never reaches the browser. */
export function createHttpAdapter(
  url = '/api/explain',
  fetchImpl: typeof fetch = (...args) => fetch(...args)
): ExplainAdapter {
  return {
    label: 'AI-generated explanation',
    isMock: false,
    async explain(input, signal) {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal,
      });
      if (!res.ok) throw new Error(`Explain endpoint returned HTTP ${res.status}`);
      return res.json();
    },
  };
}
