import { Booking } from '@/domain/types';
import { MINUTES_PER_DAY, isWellFormedInterval, minutesToLabel } from '@/domain/time';

interface Props {
  bookings: Booking[];
  blocked: boolean;
  candidateStart: number | null;
  candidateEnd: number | null;
  currentTime: number;
}

export function Timeline({ bookings, blocked, candidateStart, candidateEnd, currentTime }: Props) {
  const hours = Array.from({ length: 25 }, (_, i) => i);
  const currentPct = (currentTime / MINUTES_PER_DAY) * 100;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Today's Schedule</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" /> Booked
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-400" /> Your request
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-rose-500" /> Now
          </span>
        </div>
      </div>

      <div className="relative h-16 w-full overflow-hidden rounded-lg bg-slate-50">
        {/* hour grid lines */}
        {hours.map((h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-slate-200"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}

        {/* existing bookings */}
        {blocked ? (
          <div className="absolute inset-y-0 left-0 right-0 bg-red-200/70 flex items-center justify-center">
            <span className="text-xs font-medium text-red-700">Room blocked all day</span>
          </div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className="absolute top-1.5 bottom-1.5 rounded bg-slate-400/85 px-1.5 flex items-center overflow-hidden"
              style={{
                left: `${(b.start / MINUTES_PER_DAY) * 100}%`,
                width: `${((b.end - b.start) / MINUTES_PER_DAY) * 100}%`,
              }}
              title={`${b.title} · ${minutesToLabel(b.start)}–${minutesToLabel(b.end)}`}
            >
              <span className="truncate text-[10px] font-medium text-white">{b.title}</span>
            </div>
          ))
        )}

        {/* candidate interval */}
        {candidateStart !== null && candidateEnd !== null &&
          isWellFormedInterval(candidateStart, candidateEnd) && (
            <div
              className="absolute top-0.5 bottom-0.5 rounded border-2 border-teal-500 bg-teal-300/50"
              style={{
                left: `${(candidateStart / MINUTES_PER_DAY) * 100}%`,
                width: `${((candidateEnd - candidateStart) / MINUTES_PER_DAY) * 100}%`,
              }}
            />
        )}

        {/* current time marker */}
        {currentPct >= 0 && currentPct <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-0 border-l-2 border-rose-500 z-10"
            style={{ left: `${currentPct}%` }}
          >
            <span className="absolute -top-0 -translate-x-1/2 rounded bg-rose-500 px-1 text-[9px] font-semibold text-white">
              Now
            </span>
          </div>
        )}
      </div>

      {/* hour labels */}
      <div className="relative mt-1 h-4 w-full text-[10px] text-slate-400">
        {[0, 6, 12, 18, 24].map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2"
            style={{ left: `${(h / 24) * 100}%` }}
          >
            {minutesToLabel(h * 60)}
          </span>
        ))}
      </div>
    </div>
  );
}
