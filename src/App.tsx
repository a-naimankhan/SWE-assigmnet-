import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Clock, Search } from 'lucide-react';
import { ROOMS } from '@/lib/data';
import {
  CheckResult,
  Room,
} from '@/lib/types';
import {
  MAX_BOOKING_MINUTES,
  checkAvailability,
  labelToMinutes,
  minutesToLabel,
} from '@/lib/availability';
import { RoomSelector } from '@/components/RoomSelector';
import { Timeline } from '@/components/Timeline';
import { ResultPanel } from '@/components/ResultPanel';
import { TimeField } from '@/components/TimeField';

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function nowClockLabel(): string {
  const d = new Date();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export default function App() {
  const [rooms] = useState<Room[]>(ROOMS);
  const [selectedId, setSelectedId] = useState<string>(ROOMS[0].id);
  const [currentTime, setCurrentTime] = useState<number>(nowMinutes());
  const [clockLabel, setClockLabel] = useState<string>(nowClockLabel());

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(nowMinutes());
      setClockLabel(nowClockLabel());
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [result, setResult] = useState<CheckResult | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? null,
    [rooms, selectedId]
  );

  const startMin = labelToMinutes(startTime);
  const endMin = labelToMinutes(endTime);

  const handleCheck = () => {
    if (startMin === null || endMin === null) {
      setResult({
        decision: 'unavailable',
        reason: 'Please enter valid times in HH:MM format.',
      });
      return;
    }
    setResult(
      checkAvailability(rooms, {
        roomId: selectedId,
        start: startMin,
        end: endMin,
        currentTime,
      })
    );
  };

  const handleReset = () => {
    setStartTime('09:00');
    setEndTime('10:00');
    setResult(null);
  };

  const duration =
    startMin !== null && endMin !== null && endMin > startMin
      ? endMin - startMin
      : null;

  const durationOver = duration !== null && duration > MAX_BOOKING_MINUTES;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-900">
              Smart Campus Room Availability Checker
            </h1>
            <p className="text-xs text-slate-500">
              Prototype · fictional sample data · no booking is saved
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Step 1: Room */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
              1
            </span>
            Choose a room
          </h2>
          <RoomSelector
            rooms={rooms}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setResult(null);
            }}
          />
        </section>

        {/* Step 2: Time */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
              2
            </span>
            Enter a candidate interval
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Start time
              </label>
              <TimeField value={startTime} onChange={(v) => { setStartTime(v); setResult(null); }} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                End time
              </label>
              <TimeField value={endTime} onChange={(v) => { setEndTime(v); setResult(null); }} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">
                Current time
              </label>
              <div className="flex h-[42px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                <Clock className="mr-1.5 h-4 w-4" />
                {clockLabel}
              </div>
            </div>
          </div>

          {/* duration hint */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-500">
              Duration:{' '}
              <span className={`font-medium ${durationOver ? 'text-red-600' : 'text-slate-700'}`}>
                {duration !== null ? `${duration} min` : '—'}
              </span>
            </span>
            <span className="text-slate-400">Max {MAX_BOOKING_MINUTES} min</span>
            {durationOver && (
              <span className="text-xs font-medium text-red-600">
                Exceeds the {MAX_BOOKING_MINUTES}-minute limit
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCheck}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <Search className="h-4 w-4" />
              Check availability
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Timeline */}
        {selectedRoom && (
          <Timeline
            bookings={selectedRoom.bookings}
            blocked={selectedRoom.blocked}
            candidateStart={startMin}
            candidateEnd={endMin}
            currentTime={currentTime}
          />
        )}

        {/* Result */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
              3
            </span>
            Result
          </h2>
          <ResultPanel result={result} />
        </section>

        <footer className="pt-2 text-center text-xs text-slate-400">
          Prototype uses fictional data only. Checking availability does not create or save a booking.
        </footer>
      </main>
    </div>
  );
}
