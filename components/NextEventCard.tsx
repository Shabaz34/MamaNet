'use client';

import { useState, type FormEvent } from 'react';
import { CalendarClock, Check, ChevronDown, ChevronUp, Loader2, UserPlus, X } from 'lucide-react';
import {
  addEventGuest,
  removeEventGuest,
  useEventGuests,
  useEventRsvps,
  useMyRsvp,
  useTeamEvent,
  useTeamRoster,
  setMyRsvp,
} from '@/lib/teamHooks';
import { ATTENDANCE_TARGET, WEEKDAY_NAMES, formatDateKey, sessionDateTime, useTrainingPollState } from '@/lib/trainingHooks';

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
}

export default function NextEventCard({
  teamCode,
  uid,
  isCaptain = false,
  isCoach = false,
  hideSelfRsvp = false,
}: {
  teamCode: string;
  uid: string;
  isCaptain?: boolean;
  isCoach?: boolean;
  /** Hide the personal "מגיעה/לא מגיעה" buttons — for viewers (e.g. the coach)
   * who aren't players attending themselves, but can still see the counter/list
   * and manage guests. */
  hideSelfRsvp?: boolean;
}) {
  const event = useTeamEvent(teamCode);
  const myRsvp = useMyRsvp(teamCode, uid);
  const [saving, setSaving] = useState(false);
  const { next, pollOpen, trainingStarted, now } = useTrainingPollState(teamCode);

  const roster = useTeamRoster(teamCode);
  const rsvps = useEventRsvps(teamCode);
  const guests = useEventGuests(teamCode);
  const [guestName, setGuestName] = useState('');
  const [guestSaving, setGuestSaving] = useState(false);
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const canManageGuests = isCaptain || isCoach;
  // team_events has no poll delay — RSVP opens the moment the coach sets the
  // event — so "registration open" here just means the event hasn't started
  // yet. Guests shouldn't be addable for a session that's already over.
  const registrationOpen = Boolean(event?.date && event?.time && sessionDateTime(event.date, event.time) > now);
  const attendingPlayers = roster.filter((p) => rsvps[p.uid] === 'coming');
  const total = attendingPlayers.length + guests.length;
  const progressPct = Math.min(100, (total / ATTENDANCE_TARGET) * 100);
  const targetReached = total >= ATTENDANCE_TARGET;

  async function handleRsvp(status: 'coming' | 'not-coming') {
    setSaving(true);
    try {
      await setMyRsvp(teamCode, uid, status);
    } catch (err) {
      console.error('Failed to save RSVP:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddGuest(e: FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    setGuestSaving(true);
    try {
      await addEventGuest(teamCode, name, uid);
      setGuestName('');
    } catch (err) {
      console.error('Failed to add guest:', err);
    } finally {
      setGuestSaving(false);
    }
  }

  async function handleRemoveGuest(guestId: string) {
    try {
      await removeEventGuest(teamCode, guestId);
    } catch (err) {
      console.error('Failed to remove guest:', err);
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
    <div className="rounded-3xl bg-white border border-violet-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
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

      {/* Attendance counter — red until reaching the target, green once reached */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold text-slate-500">נרשמו להגיע</p>
          <button
            type="button"
            onClick={() => setAttendeesOpen((v) => !v)}
            aria-expanded={attendeesOpen}
            disabled={total === 0}
            className={`flex items-center gap-1 text-lg font-extrabold tabular-nums transition disabled:cursor-default ${
              targetReached ? 'text-emerald-600' : 'text-rose-500'
            } ${total > 0 ? 'hover:opacity-70' : ''}`}
          >
            {total}/{ATTENDANCE_TARGET}
            {total > 0 && (attendeesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
          </button>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${targetReached ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {attendeesOpen && total > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1 rounded-2xl bg-slate-50 p-2.5 animate-[fade-in_0.15s_ease-out]">
            {attendingPlayers.map((p) => (
              <li key={p.uid} className="flex items-center gap-2 px-1.5 py-1 text-sm text-slate-700">
                <Check size={13} className="text-emerald-600 shrink-0" />
                {p.fullName}
              </li>
            ))}
            {guests.map((g) => (
              <li key={g.id} className="flex items-center gap-2 px-1.5 py-1 text-sm text-slate-700">
                <Check size={13} className="text-emerald-600 shrink-0" />
                {g.name}
                <span className="text-[10px] font-bold text-slate-400">משלימה</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!hideSelfRsvp && (
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
      )}

      {/* Guests (coach + captain only) */}
      {canManageGuests && (
        <div className="border-t border-violet-50 pt-4 flex flex-col gap-2.5">
          <p className="text-xs font-bold text-slate-500">משלימות</p>

          {guests.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {guests.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span>{g.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGuest(g.id)}
                    aria-label={`הסרת ${g.name}`}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition shrink-0"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {registrationOpen ? (
            <form onSubmit={handleAddGuest} className="flex gap-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="שם המשלימה"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 min-h-[44px] text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              />
              <button
                type="submit"
                disabled={!guestName.trim() || guestSaving}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 text-white px-3.5 py-2.5 min-h-[44px] text-sm font-bold hover:bg-violet-700 disabled:opacity-40 transition shrink-0"
              >
                {guestSaving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                הוספה
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">ניתן להוסיף משלימות רק כל עוד ההרשמה פתוחה.</p>
          )}
        </div>
      )}
    </div>
  );
}
