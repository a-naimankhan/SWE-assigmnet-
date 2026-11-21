import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { explainAvailability } from '@/ai/explain';
import type { ExplainAdapter, ExplainInput, ExplainOutcome } from '@/ai/explain';

interface Props {
  input: ExplainInput;
  adapter: ExplainAdapter;
  timeoutMs?: number;
}

type State = { phase: 'idle' } | { phase: 'loading' } | { phase: 'done'; outcome: ExplainOutcome };

const CAUSE_TEXT = {
  timeout: 'The AI explanation took too long.',
  error: 'The AI explanation service is unavailable.',
  'invalid-output': 'The AI explanation did not pass the safety checks.',
} as const;

/**
 * Optional explanation under the checker result. It never changes the
 * decision above it and is visually separate from it (AC5). The parent keys
 * this component by its input, so a stale explanation cannot survive a change
 * of room, time or result.
 */
export function ExplainPanel({ input, adapter, timeoutMs }: Props) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = async () => {
    if (state.phase === 'loading') return;
    setState({ phase: 'loading' });
    const outcome = await explainAvailability(input, adapter, { timeoutMs });
    if (mounted.current) setState({ phase: 'done', outcome });
  };

  return (
    <div className="mt-3" data-testid="explain-panel">
      <button
        type="button"
        onClick={run}
        disabled={state.phase === 'loading'}
        className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {state.phase === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {state.phase === 'loading' ? 'Explaining…' : 'Explain availability'}
      </button>

      {state.phase === 'done' && <Outcome outcome={state.outcome} adapter={adapter} />}
    </div>
  );
}

function Outcome({ outcome, adapter }: { outcome: ExplainOutcome; adapter: ExplainAdapter }) {
  if (outcome.kind === 'rejected') {
    return (
      <p role="alert" data-testid="explain-rejected" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        Cannot explain this request: {outcome.message}
      </p>
    );
  }

  const generated = outcome.kind === 'generated';
  return (
    <div
      data-testid={generated ? 'explain-generated' : 'explain-fallback'}
      className="mt-3 rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-violet-700">
        {generated ? <Sparkles className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        <span className="rounded-full bg-violet-100 px-2 py-0.5">
          {generated ? adapter.label : 'Standard explanation (AI not used)'}
        </span>
      </div>
      <p className="text-sm text-slate-700">{outcome.explanation}</p>
      {!generated && (
        <p className="mt-1 text-xs text-slate-500">{CAUSE_TEXT[outcome.cause]}</p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        This text only explains the result above. It is not a booking confirmation and nothing was reserved.
      </p>
    </div>
  );
}
