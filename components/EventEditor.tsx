'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CalendarClock, ChevronDown, Loader2 } from 'lucide-react';
import { useTeamEvent, saveTeamEvent, type TeamEvent } from '@/lib/teamHooks';
import { auth } from '@/lib/firebase';

const EMPTY_EVENT: TeamEvent = { title: '', type: 'practice', date: '', time: '' };

export default function EventEditor({ teamCode, coachUid }: { teamCode: string; coachUid: string }) {
  const event = useTeamEvent(teamCode);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TeamEvent>(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) setForm(event);
  }, [event]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.date || !form.time) return;
    // Only ping everyone when this is a genuinely new event or the date/time
    // moved — editing just the title on an unchanged date shouldn't re-notify.
    const isNewOrRescheduled = !event || event.date !== form.date || event.time !== form.time;
    setSaving(true);
    try {
      await saveTeamEvent(teamCode, form, coachUid);
      setOpen(false);
      if (isNewOrRescheduled) notifyEventOpened(form.type);
    } catch (err) {
      console.error('Failed to save team event:', err);
    } finally {
      setSaving(false);
    }
  }

  // Best-effort — a failed push shouldn't block saving the event.
  async function notifyEventOpened(eventType: TeamEvent['type']) {
    try {
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) return;
      await fetch('/api/notify-event-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ teamCode, eventType }),
      });
    } catch (err) {
      console.error('Failed to send event-opened push:', err);
    }
  }

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
            <p className="text-sm font-bold text-slate-800">האימון / משחק הבא</p>
            <p className="text-xs text-slate-400">
              {event
                ? `${event.type === 'game' ? 'משחק' : 'אימון'} · ${event.date} · ${event.time}`
                : 'טרם נקבע — השחקניות לא רואות כלום עדיין'}
            </p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form onSubmit={handleSave} className="px-4 pb-4 pt-1 border-t border-violet-50 flex flex-col gap-3 animate-[fade-in_0.2s_ease-out]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: 'practice' }))}
              className={`flex-1 rounded-xl py-3 min-h-[48px] text-sm font-bold transition ${
                form.type === 'practice' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              אימון
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: 'game' }))}
              className={`flex-1 rounded-xl py-3 min-h-[48px] text-sm font-bold transition ${
                form.type === 'game' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              משחק
            </button>
          </div>

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
    </section>
  );
}
