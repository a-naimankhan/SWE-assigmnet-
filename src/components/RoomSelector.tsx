import { Room } from '@/domain/types';
import { Check, Lock, MapPin, Users } from 'lucide-react';

interface Props {
  rooms: readonly Room[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RoomSelector({ rooms, selectedId, onSelect }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => {
        const active = room.id === selectedId;
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
            className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
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
              <span className="flex items-center gap-1 text-slate-500">
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
          </button>
        );
      })}
    </div>
  );
}
