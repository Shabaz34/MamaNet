'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CalendarClock, ChevronDown, Loader2 } from 'lucide-react';
import { useTeamEvent, saveTeamEvent, type TeamEvent } from '@/lib/teamHooks';
import { WEEKDAY_NAMES, sessionDateTime, useTrainingPollState } from '@/lib/trainingHooks';
import { auth } from '@/lib/firebase';
import TrainingScheduleEditor from './TrainingScheduleEditor';

const EMPTY_GAME: TeamEvent = { title: '', type: 'game', date: '', time: '' };

// Sets up what the team sees as "the next thing coming up": a one-off game
// (always ad-hoc — teams don't play the same opponent every week) or the
// recurring weekly training slot. Games are coach-only (team_events write
// rule); the training schedule can be owned by either the coach or the
// captain, so this same editor is reused in both dashboards — captain view
// just hides the game half via `allowGames=false`.
export default function EventEditor({
  teamCode,
  uid,
  allowGames = true,
}: {
  teamCode: string;
  uid: string;
  allowGames?: boolean;
}) {
  const event = useTeamEvent(teamCode);
  const { next: nextTraining } = useTrainingPollState(teamCode);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TeamEvent['type']>(allowGames ? 'game' : 'practice');
  const [form, setForm] = useState<TeamEvent>(EMPTY_GAME);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event && event.type === 'game') setForm(event);
  }, [event]);

  async function handleSaveGame(e: FormEvent) {
    e.preventDefault();
    if (!form.date || !form.time) return;
    // Only ping everyone when this is a genuinely new game or the date/time
    // moved — editing just the title on an unchanged date shouldn't re-notify.
    const isNewOrRescheduled = !event || event.date !== form.date || event.time !== form.time;
    setSaving(true);
    try {
      await saveTeamEvent(teamCode, { ...form, type: 'game' }, uid);
      setOpen(false);
      if (isNewOrRescheduled) notifyEventOpened();
    } catch (err) {
      console.error('Failed to save team event:', err);
    } finally {
      setSaving(false);
    }
  }

  // Best-effort — a failed push shouldn't block saving the event.
  async function notifyEventOpened() {
    try {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) return;
      await fetch('/api/notify-event-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ teamCode, eventType: 'game' }),
      });
    } catch (err) {
      console.error('Failed to send event-opened push:', err);
    }
  }

  const summary =
    allowGames && event
      ? `${event.type === 'game' ? 'משחק' : 'אימון'} · ${event.date} · ${event.time}`
      : nextTraining
        ? `אימון מחזורי · יום ${WEEKDAY_NAMES[sessionDateTime(nextTraining.dateKey, nextTraining.time).getDay()]} · ${nextTraining.time}`
        : 'טרם נקבע — השחקניות לא רואות כלום עדיין';

  return (
    <section className="rounded-2xl border border-violet-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-4 min-h-[52px] text-right"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <CalendarClock size={16} className="text-violet-600" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">{allowGames ? 'האימון / משחק הבא' : 'לוח האימונים'}</p>
            <p className="text-xs text-slate-400">{summary}</p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-violet-50 flex flex-col gap-3 animate-[fade-in_0.2s_ease-out]">
          {allowGames && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('practice')}
                className={`flex-1 rounded-xl py-3 min-h-[48px] text-sm font-bold transition ${
                  type === 'practice' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                אימון
              </button>
              <button
                type="button"
                onClick={() => setType('game')}
                className={`flex-1 rounded-xl py-3 min-h-[48px] text-sm font-bold transition ${
                  type === 'game' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                משחק
              </button>
            </div>
          )}

          {type === 'practice' ? (
            <TrainingScheduleEditor teamCode={teamCode} uid={uid} />
          ) : (
            <form onSubmit={handleSaveGame} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-3 min-h-[48px] text-sm text-slate-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                />
                <input
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-3 min-h-[48px] text-sm text-slate-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                />
              </div>

              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="פרטים נוספים (רשות) — לדוגמה: מול מאמאנט רעננה"
                className="rounded-xl border border-slate-200 px-3.5 py-3 min-h-[48px] text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              />

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white py-3 min-h-[48px] text-sm font-bold hover:bg-violet-700 disabled:opacity-60 transition"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                שמירת עדכון
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
