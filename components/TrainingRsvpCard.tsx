'use client';

import { useState, type FormEvent } from 'react';
import { CalendarClock, Check, ChevronDown, ChevronUp, Loader2, UserPlus, X } from 'lucide-react';
import { useTeamRoster } from '@/lib/teamHooks';
import {
  ATTENDANCE_TARGET,
  WEEKDAY_NAMES,
  addTrainingGuest,
  formatDateKey,
  isWithinNearTerm,
  removeTrainingGuest,
  sessionDateTime,
  setMyTrainingRsvp,
  useTrainingGuests,
  useTrainingPollState,
  useTrainingRsvps,
  useTrainingSettings,
} from '@/lib/trainingHooks';

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} דקות`;
  return `${hours} שעות ו-${minutes} דקות`;
}

export default function TrainingRsvpCard({
  teamCode,
  uid,
  isCaptain,
  hideSelfRsvp = false,
}: {
  teamCode: string;
  uid: string;
  isCaptain: boolean;
  /** Hide the personal "מגיעה/לא מגיעה" buttons — for viewers (e.g. the coach)
   * who aren't players attending training themselves, but can still see the
   * counter/list and (if isCaptain) manage guests. */
  hideSelfRsvp?: boolean;
}) {
  const settings = useTrainingSettings(teamCode);
  const { next: rawNext, pollOpen, trainingStarted, msUntilPollOpens, now } = useTrainingPollState(teamCode);
  // Only show a session coming up within the next week — same one-week
  // horizon as the other "what's next" cards on the dashboard. In practice
  // this only ever excludes something when a manual override pushed the
  // next occurrence unusually far out; the plain weekly default is always
  // within a week of "now" by construction.
  const next = rawNext && isWithinNearTerm(sessionDateTime(rawNext.dateKey, rawNext.time), now) ? rawNext : null;
  const rsvps = useTrainingRsvps(teamCode, next?.dateKey);
  const guests = useTrainingGuests(teamCode, next?.dateKey);
  const roster = useTeamRoster(teamCode);

  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestSaving, setGuestSaving] = useState(false);
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const attendingPlayers = roster.filter((p) => rsvps[p.uid] === 'coming');
  const attendingCount = attendingPlayers.length;
  const total = attendingCount + guests.length;
  const progressPct = Math.min(100, (total / ATTENDANCE_TARGET) * 100);
  const targetReached = total >= ATTENDANCE_TARGET;

  const myStatus = rsvps[uid];

  async function handleRsvp(status: 'coming' | 'not-coming') {
    if (!next) return;
    setRsvpSaving(true);
    try {
      await setMyTrainingRsvp(teamCode, next.dateKey, uid, status);
    } catch (err) {
      console.error('Failed to save training RSVP:', err);
    } finally {
      setRsvpSaving(false);
    }
  }

  async function handleAddGuest(e: FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name || !next) return;
    setGuestSaving(true);
    try {
      await addTrainingGuest(teamCode, next.dateKey, name, uid);
      setGuestName('');
    } catch (err) {
      console.error('Failed to add guest:', err);
    } finally {
      setGuestSaving(false);
    }
  }

  async function handleRemoveGuest(guestId: string) {
    if (!next) return;
    try {
      await removeTrainingGuest(teamCode, next.dateKey, guestId);
    } catch (err) {
      console.error('Failed to remove guest:', err);
    }
  }

  if (!settings && !isCaptain) {
    return (
      <div className="rounded-3xl bg-white border border-violet-100 shadow-sm p-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
          <CalendarClock size={18} className="text-violet-600" />
        </span>
        <p className="text-sm text-slate-500 leading-relaxed">הקפטנית עוד לא קבעה מועד קבוע לאימונים.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-violet-100 shadow-sm overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        {/* Attendance counter + progress bar */}
        {next && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-slate-500">משלימות לאימון</p>
              <button
                type="button"
                onClick={() => setAttendeesOpen((v) => !v)}
                aria-expanded={attendeesOpen}
                disabled={total === 0}
                className={`flex items-center gap-1 text-lg font-extrabold tabular-nums transition disabled:cursor-default ${
                  targetReached ? 'text-emerald-600' : 'text-violet-600'
                } ${total > 0 ? 'hover:opacity-70' : ''}`}
              >
                {total}/{ATTENDANCE_TARGET}
                {total > 0 && (attendeesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
              </button>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${targetReached ? 'bg-emerald-500' : 'bg-violet-500'}`}
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
        )}

        {/* Header + schedule */}
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <CalendarClock size={18} className="text-violet-600" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wide">האימון הבא</p>
            {next ? (
              <p className="text-[15px] font-extrabold text-slate-800 leading-snug text-balance">
                יום {WEEKDAY_NAMES[sessionDateTime(next.dateKey, next.time).getDay()]}, {formatDateKey(next.dateKey)} בשעה{' '}
                {next.time}
                {next.isOverridden && (
                  <span className="ms-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle">
                    עודכן
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {settings ? 'האימון הבא לא בטווח השבוע הקרוב' : 'טרם נקבע מועד קבוע'}
              </p>
            )}
            {settings && (
              <p className="text-xs text-slate-400 mt-0.5">
                קבוע: כל יום {WEEKDAY_NAMES[settings.weekday]} בשעה {settings.time}
              </p>
            )}
          </div>
        </div>

        {/* Poll */}
        {!hideSelfRsvp &&
          next &&
          (pollOpen ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={rsvpSaving}
                onClick={() => handleRsvp('coming')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3.5 min-h-[52px] text-sm font-extrabold transition disabled:opacity-60 ${
                  myStatus === 'coming' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Check size={16} />
                מגיעה לאימון!
              </button>
              <button
                type="button"
                disabled={rsvpSaving}
                onClick={() => handleRsvp('not-coming')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-3.5 min-h-[52px] text-sm font-extrabold transition disabled:opacity-60 ${
                  myStatus === 'not-coming' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <X size={16} />
                לא מגיעה :(
              </button>
            </div>
          ) : trainingStarted ? (
            <p className="text-sm text-slate-400 text-center py-2">האימון כבר התחיל.</p>
          ) : (
            <p className="text-sm text-slate-500 bg-violet-50/60 rounded-2xl px-4 py-3 text-center leading-relaxed">
              הסקר ייפתח בעוד <span className="font-bold text-violet-600">{formatCountdown(msUntilPollOpens ?? 0)}</span>
            </p>
          ))}

        {/* Guests (captain / coach) */}
        {isCaptain && next && (
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

            {pollOpen ? (
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
    </div>
  );
}
