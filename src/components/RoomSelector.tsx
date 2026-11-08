import type { Room } from '@/domain/types';
import { equipmentLabel } from '@/domain/filter';
import { Check, Lock, MapPin, SearchX, Users } from 'lucide-react';

interface Props {
  rooms: readonly Room[];
  totalRooms: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
}

export function RoomSelector({ rooms, totalRooms, selectedId, onSelect, onClearFilters }: Props) {
  // F4: clear empty state when no room matches the requirements
  if (rooms.length === 0) {
    return (
      <div
        role="status"
        data-testid="empty-state"
        className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center"
      >
        <SearchX className="h-6 w-6 text-amber-600" />
        <p className="font-semibold text-amber-800">No rooms match your requirements</p>
        <p className="text-sm text-amber-700">
          None of the {totalRooms} rooms has enough capacity and all of the selected equipment.
          Try fewer attendees or less equipment.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-1 rounded-xl border border-amber-400 bg-white px-4 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500" data-testid="match-count">
        Showing {rooms.length} of {totalRooms} rooms
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Matching rooms">
        {rooms.map((room) => {
          const active = room.id === selectedId;
          return (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => onSelect(room.id)}
                aria-pressed={active}
                className={`h-full w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                  active
                    ? 'border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{room.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {room.building}
                    </p>
                  </div>
                  {active && <Check className="h-5 w-5 text-teal-600" />}
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-slate-500" title="Capacity">
                    <Users className="h-3.5 w-3.5" />
                    {room.capacity}
                  </span>
                  {room.blocked ? (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      <Lock className="h-3 w-3" />
                      Blocked
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Open
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {room.equipment.length === 0 ? (
                    <span className="text-xs text-slate-400">No equipment</span>
                  ) : (
                    room.equipment.map((item) => (
                      <span
                        key={item}
                        className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                      >
                        {equipmentLabel(item)}
                      </span>
                    ))
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
