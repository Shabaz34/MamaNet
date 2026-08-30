'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { RosterPlayer } from '@/lib/teamHooks';
import type { Lineup, Position } from '@/lib/lineupHooks';

// Standard volleyball/catchball rotation layout: front row near the net is
// 2-3-4 (left to right), back row is 1-6-5.
const ROW_LAYOUT: Position[][] = [
  [2, 3, 4],
  [1, 6, 5],
];

export default function LineupCourt({
  roster,
  lineup,
  onChange,
}: {
  roster: RosterPlayer[];
  lineup: Lineup;
  onChange: (lineup: Lineup) => void;
}) {
  const [pickerPosition, setPickerPosition] = useState<Position | null>(null);

  const assignedUids = new Set(Object.values(lineup).filter((v): v is string => Boolean(v)));

  function handleAssign(position: Position, uid: string) {
    onChange({ ...lineup, [position]: uid });
    setPickerPosition(null);
  }

  function handleClear(position: Position) {
    const next = { ...lineup };
    delete next[position];
    onChange(next);
  }

  function playerName(uid?: string): string | null {
    if (!uid) return null;
    return roster.find((p) => p.uid === uid)?.fullName ?? null;
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-emerald-700/20 bg-emerald-600 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 h-1.5 rounded-full bg-white/80" />
        <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-wide shrink-0">רשת</span>
        <div className="flex-1 h-1.5 rounded-full bg-white/80" />
      </div>

      <div className="flex flex-col gap-5">
        {ROW_LAYOUT.map((row, i) => (
          <div key={i} className="grid grid-cols-3 gap-3">
            {row.map((position) => {
              const uid = lineup[position];
              const name = playerName(uid);
              return (
                <div key={position} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => !name && setPickerPosition(position)}
                    className={`relative w-full aspect-square rounded-full flex items-center justify-center text-center p-1.5 transition ${
                      name
                        ? 'bg-white text-emerald-700 shadow-md'
                        : 'bg-emerald-500/40 text-white border-2 border-dashed border-white/60 hover:bg-emerald-500/60'
                    }`}
                  >
                    {name ? (
                      <span className="text-xs font-extrabold leading-tight break-words px-1">{name}</span>
                    ) : (
                      <span className="text-xs font-bold">עמדה {position}</span>
                    )}
                  </button>
                  {name && (
                    <button
                      type="button"
                      onClick={() => handleClear(position)}
                      className="flex items-center gap-1 text-[10px] font-bold text-white/80 hover:text-white transition"
                    >
                      <X size={10} />
                      הסרה
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {pickerPosition !== null && (
        <PlayerPicker
          roster={roster}
          assignedUids={assignedUids}
          position={pickerPosition}
          onSelect={(uid) => handleAssign(pickerPosition, uid)}
          onClose={() => setPickerPosition(null)}
        />
      )}
    </div>
  );
}

function PlayerPicker({
  roster,
  assignedUids,
  position,
  onSelect,
  onClose,
}: {
  roster: RosterPlayer[];
  assignedUids: Set<string>;
  position: Position;
  onSelect: (uid: string) => void;
  onClose: () => void;
}) {
  const available = roster.filter((p) => !assignedUids.has(p.uid));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-slate-800">בחירת שחקנית לעמדה {position}</h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {available.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">כל השחקניות כבר משובצות.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {available.map((p) => (
              <li key={p.uid}>
                <button
                  type="button"
                  onClick={() => onSelect(p.uid)}
                  className="w-full text-right rounded-xl px-3.5 py-3 min-h-[48px] text-sm font-bold text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition"
                >
                  {p.fullName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
