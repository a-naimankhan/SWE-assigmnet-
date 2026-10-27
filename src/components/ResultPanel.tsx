import { CheckResult } from '@/lib/types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  result: CheckResult | null;
}

export function ResultPanel({ result }: Props) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Select a room, enter start and end times, then check availability.
      </div>
    );
  }

  const available = result.decision === 'available';

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-5 transition-colors ${
        available
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-red-300 bg-red-50'
      }`}
    >
      {available ? (
        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="h-6 w-6 shrink-0 text-red-600" />
      )}
      <div>
        <p
          className={`text-lg font-bold ${
            available ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {available ? 'Available' : 'Unavailable'}
        </p>
        <p className="mt-0.5 text-sm text-slate-600">{result.reason}</p>
      </div>
    </div>
  );
}
