import { SlidersHorizontal } from 'lucide-react';
import type { Equipment } from '@/domain/types';
import { EQUIPMENT_OPTIONS } from '@/domain/filter';

interface Props {
  attendees: string;
  attendeesError: string | null;
  equipment: readonly Equipment[];
  onAttendeesChange: (value: string) => void;
  onToggleEquipment: (item: Equipment) => void;
  onClear: () => void;
}

/** Presentation only: the filtering rules live in domain/filter.ts. */
export function RoomFilters({
  attendees,
  attendeesError,
  equipment,
  onAttendeesChange,
  onToggleEquipment,
  onClear,
}: Props) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <SlidersHorizontal className="h-4 w-4" /> Requirements
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-teal-700 hover:underline"
        >
          Clear filters
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div>
          <label htmlFor="attendees" className="mb-1.5 block text-sm font-medium text-slate-600">
            Attendees
          </label>
          <input
            id="attendees"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Any"
            value={attendees}
            onChange={(e) => onAttendeesChange(e.target.value)}
            aria-invalid={attendeesError !== null}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          {attendeesError && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
              {attendeesError}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-slate-600">
            Required equipment
          </legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((opt) => {
              const checked = equipment.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    checked
                      ? 'border-teal-500 bg-teal-50 text-teal-800'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-teal-600"
                    checked={checked}
                    onChange={() => onToggleEquipment(opt.id)}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
