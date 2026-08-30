'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Users2, Crown } from 'lucide-react';
import type { RosterPlayer } from '@/lib/teamHooks';

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-teal-500'];

export default function TeamRoster({
  players,
  captainUid,
}: {
  players: RosterPlayer[];
  captainUid?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...players].sort((a, b) => (a.uid === captainUid ? -1 : b.uid === captainUid ? 1 : 0)),
    [players, captainUid],
  );

  return (
    <section className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-xl bg-white border border-violet-100 px-4 py-3.5 min-h-[52px] shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05),0_2px_4px_-2px_rgb(0_0_0_/_0.05)] hover:bg-violet-50/40 transition"
      >
        <span className="flex items-center gap-2">
          <Users2 size={18} className="text-violet-600" />
          <span className="text-sm font-extrabold text-slate-800">שחקניות הקבוצה</span>
        </span>

        <span className="flex items-center gap-2.5">
          {sorted.length > 0 && (
            <span className="flex items-center -space-x-2 space-x-reverse">
              {sorted.slice(0, 4).map((p, i) => (
                <span key={p.uid} className="relative">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatarUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <span
                      className={`w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-sm ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                    >
                      {p.fullName.trim().charAt(0) || '?'}
                    </span>
                  )}
                  {p.uid === captainUid && (
                    <span className="absolute -top-1.5 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                      <Crown size={9} className="text-white" fill="currentColor" />
                    </span>
                  )}
                </span>
              ))}
              {sorted.length > 4 && (
                <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
                  +{sorted.length - 4}
                </span>
              )}
            </span>
          )}
          <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
            {sorted.length}
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <>
          {/* click-outside catcher — doesn't affect layout, just closes the dropdown */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />

          <div className="absolute top-full inset-x-0 mt-2 z-20 rounded-xl bg-white border border-violet-100 shadow-lg p-3 max-h-56 overflow-y-auto animate-[fade-in_0.15s_ease-out]">
            {sorted.length === 0 ? (
              <p className="text-sm text-slate-400 px-1">עוד לא נרשמו שחקניות עם קוד הקבוצה שלך.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {sorted.map((p, i) => (
                  <li key={p.uid} className="flex items-center gap-2 rounded-xl bg-violet-50/40 px-3 py-2.5 min-h-[44px]">
                    <span className="relative shrink-0">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span
                          className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                        >
                          {p.fullName.trim().charAt(0) || '?'}
                        </span>
                      )}
                      {p.uid === captainUid && (
                        <span className="absolute -top-1.5 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                          <Crown size={9} className="text-white" fill="currentColor" />
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 truncate">{p.fullName}</span>
                    {p.uid === captainUid && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                        קפטנית
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
