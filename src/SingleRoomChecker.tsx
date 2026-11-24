/**
 * Practice #13 code-based solution: one room, start time + duration.
 * Layers: validation + decision in `domain/slot.ts` (pure), data in
 * `data/rooms.ts` (read-only), this file only displays.
 */
import { useState } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, Search, XCircle } from 'lucide-react';
import contract from '../practice13/shared/contract.json';
import { ROOMS } from '@/data/rooms';
import { FIXED_NOW } from '@/domain/clock';
import { checkSlot, parseDuration, type SlotDecision } from '@/domain/slot';
import { MAX_BOOKING_MINUTES, labelToMinutes, minutesToLabel } from '@/domain/time';
import type { Room } from '@/domain/types';
import { TimeField } from '@/components/TimeField';
import { Timeline } from '@/components/Timeline';

const DEFAULT_ROOM = ROOMS.find((r) => r.id === contract.room.id)!;
const PRESETS = contract.cases.filter(
  (c): c is (typeof contract.cases)[number] & {
    startTime: string;
    durationMinutes: number;
    roomBlocked: boolean;
  } => 'startTime' in c
);

interface Props {
  room?: Room;
  currentTime?: number;
}

export default function SingleRoomChecker({ room = DEFAULT_ROOM, currentTime = FIXED_NOW }: Props) {
  const [startTime, setStartTime] = useState('10:30');
  const [durationText, setDurationText] = useState('60');
  const [blocked, setBlocked] = useState(false);
  const [decision, setDecision] = useState<SlotDecision | null>(null);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDecision(null); // a result always belongs to the inputs shown
  };

  const check = () =>
    setDecision(
      checkSlot({
        startTime,
        durationMinutes: parseDuration(durationText),
        roomName: room.name,
        roomBlocked: blocked,
        bookings: room.bookings,
        currentTime,
      })
    );

  const start = labelToMinutes(startTime);
  const duration = parseDuration(durationText);
  const end = start !== null && duration !== null && duration > 0 ? start + duration : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight text-slate-900">Single-room checker</h1>
            <p className="text-xs text-slate-500">
              Practice #13 · code-based track · fictional data · nothing is saved
            </p>
          </div>
          <a href="#/" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Full catalog
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">{room.name}</h2>
          <p className="mb-4 text-xs text-slate-500">
            Current time is fixed at {minutesToLabel(currentTime)} · max {MAX_BOOKING_MINUTES} min
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium text-slate-600">
              <span className="mb-1.5 block">Start time</span>
              <TimeField value={startTime} onChange={edit(setStartTime)} />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              <span className="mb-1.5 block">Duration (minutes)</span>
              <input
                aria-label="Duration (minutes)"
                inputMode="numeric"
                value={durationText}
                onChange={(e) => edit(setDurationText)(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </label>
            <div className="text-sm font-medium text-slate-600">
              <span className="mb-1.5 block">Room status</span>
              <label className="flex h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
                <input
                  type="checkbox"
                  checked={blocked}
                  onChange={(e) => edit(setBlocked)(e.target.checked)}
                  className="h-4 w-4 accent-red-600"
                />
                {blocked ? 'Blocked' : 'Open'}
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={check}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Search className="h-4 w-4" /> Check availability
          </button>
        </section>

        <section aria-live="polite" data-testid="slot-result">
          {decision === null ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
              Enter a start time and duration, then press Check availability.
            </p>
          ) : (
            <div
              className={`rounded-2xl border p-5 ${
                decision.available ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {decision.available ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <span
                  data-testid="slot-decision"
                  className={`text-lg font-bold ${decision.available ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {decision.available ? 'Available' : 'Unavailable'}
                </span>
                <code data-testid="slot-code" className="ml-auto rounded bg-white/70 px-2 py-0.5 text-xs text-slate-600">
                  {decision.reasonCode}
                </code>
              </div>
              <p data-testid="slot-message" className="mt-2 text-sm text-slate-700">
                {decision.message}
              </p>
            </div>
          )}
        </section>

        <Timeline
          bookings={room.bookings}
          blocked={blocked}
          candidateStart={start}
          candidateEnd={end}
          currentTime={currentTime}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Existing bookings (read-only)</h2>
          <ul data-testid="booking-list" className="divide-y divide-slate-100 text-sm">
            {room.bookings.map((b) => (
              <li key={b.id} className="flex justify-between py-1.5">
                <span>{b.title}</span>
                <span className="tabular-nums text-slate-500">
                  {minutesToLabel(b.start)}–{minutesToLabel(b.end)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Shared test inputs (fill the form)</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.title}
                onClick={() => {
                  setStartTime(c.startTime);
                  setDurationText(String(c.durationMinutes));
                  setBlocked(c.roomBlocked);
                  setDecision(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {c.id}: {c.title}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
