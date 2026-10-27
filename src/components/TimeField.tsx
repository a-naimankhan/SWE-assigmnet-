import { minutesToLabel } from '@/lib/availability';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function TimeField({ value, onChange, disabled }: Props) {
  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100"
    />
  );
}

export function minutesToTimeInput(min: number): string {
  return minutesToLabel(min);
}
