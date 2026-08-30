'use client';

import { useState } from 'react';
import { CalendarClock, Check, X } from 'lucide-react';
import { useMyRsvp, useTeamEvent, setMyRsvp } from '@/lib/teamHooks';
import { WEEKDAY_NAMES, formatDateKey, sessionDateTime, useTrainingPollState } from '@/lib/trainingHooks';

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
}

export default function NextEventCard({ teamCode, playerUid }: { teamCode: string; playerUid: string }) {
  const event = useTeamEvent(teamCode);
  const myRsvp = useMyRsvp(teamCode, playerUid);
  const [saving, setSaving] = useState(false);
  const { next, pollOpen, trainingStarted } = useTrainingPollState(teamCode);

  async function handleRsvp(status: 'coming' | 'not-coming') {
    setSaving(true);
    try {
      await setMyRsvp(teamCode, playerUid, status);
    } catch (err) {
      console.error('Failed to save RSVP:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!event) {
    // Once the weekly training poll takes over (24h before the session), it
    // already shows this same date — avoid showing it twice.
    if (pollOpen || trainingStarted) return null;

    if (next) {
      return (
        <div className="rounded-3xl bg-white border border-violet-100 shadow-sm p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <CalendarClock size={18} className="text-violet-600" />
          </span>
          <div>
            <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wide">האימון הבא</p>
            <p className="text-[15px] font-extrabold text-slate-800 leading-snug text-balance">
              יום {WEEKDAY_NAMES[sessionDateTime(next.dateKey, next.time).getDay()]}, {formatDateKey(next.dateKey)} בשעה{' '}
              {next.time}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl bg-white border border-violet-100 shadow-sm p-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
          <CalendarClock size={18} className="text-violet-600" />
        </span>
        <p className="text-sm text-slate-500 leading-relaxed">המאמנת עוד לא קבעה את האימון או המשחק הבא.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-violet-100 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
          <CalendarClock size={18} className="text-violet-600" />
        </span>
        <div>
          <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wide">
            {event.type === 'game' ? 'המשחק הבא' : 'האימון הבא'}
          </p>
          <p className="text-[15px] font-extrabold text-slate-800 leading-snug text-balance">
            {formatEventDate(event.date)}
            {event.time ? ` · ${event.time}` : ''}
          </p>
          {event.title && <p className="text-xs text-slate-500 mt-0.5">{event.title}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleRsvp('coming')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3.5 min-h-[52px] text-sm font-extrabold transition disabled:opacity-60 ${
            myRsvp === 'coming' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <Check size={16} />
          מגיעה
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleRsvp('not-coming')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3.5 min-h-[52px] text-sm font-extrabold transition disabled:opacity-60 ${
            myRsvp === 'not-coming' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <X size={16} />
          לא מגיעה
        </button>
      </div>
    </div>
  );
}
