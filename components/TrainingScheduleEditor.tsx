'use client';

import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import {
  WEEKDAY_NAMES,
  saveTrainingOverride,
  saveTrainingSettings,
  sessionDateTime,
  useTrainingPollState,
  useTrainingSettings,
} from '@/lib/trainingHooks';

const inputClass =
  'flex-1 rounded-xl border border-slate-200 px-3 py-3 min-h-[48px] text-sm text-slate-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition';

// Configures the recurring weekly training slot (same weekday + time every
// week, no need to re-set it) and, separately, lets you move just the next
// occurrence without touching that weekly default. Shared by the coach's
// event editor and the captain's dashboard — either role may own the team's
// practice schedule.
export default function TrainingScheduleEditor({ teamCode, uid }: { teamCode: string; uid: string }) {
  const settings = useTrainingSettings(teamCode);
  const { next } = useTrainingPollState(teamCode);

  const [weekday, setWeekday] = useState(settings?.weekday ?? 2);
  const [time, setTime] = useState(settings?.time ?? '20:00');
  const [savingDefault, setSavingDefault] = useState(false);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideTime, setOverrideTime] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  async function handleSaveDefault(e: FormEvent) {
    e.preventDefault();
    setSavingDefault(true);
    try {
      await saveTrainingSettings(teamCode, { weekday, time }, uid);
    } catch (err) {
      console.error('Failed to save training settings:', err);
    } finally {
      setSavingDefault(false);
    }
  }

  function openOverride() {
    if (next) {
      setOverrideDate(next.dateKey);
      setOverrideTime(next.time);
    }
    setOverrideOpen(true);
  }

  async function handleSaveOverride(e: FormEvent) {
    e.preventDefault();
    if (!next || !overrideDate || !overrideTime) return;
    setSavingOverride(true);
    try {
      await saveTrainingOverride(teamCode, next.defaultDateKey, overrideDate, overrideTime, uid);
      setOverrideOpen(false);
    } catch (err) {
      console.error('Failed to save training override:', err);
    } finally {
      setSavingOverride(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {next && (
        <p className="text-xs text-slate-500 leading-relaxed">
          האימון הקרוב: יום {WEEKDAY_NAMES[sessionDateTime(next.dateKey, next.time).getDay()]},{' '}
          {next.dateKey.split('-').reverse().slice(0, 2).join('.')} בשעה {next.time}
          {next.isOverridden && (
            <span className="ms-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full align-middle">
              עודכן
            </span>
          )}
        </p>
      )}

      <form onSubmit={handleSaveDefault} className="flex flex-col gap-3">
        <p className="text-xs font-bold text-slate-600">אימון מחזורי — אותו יום ואותה שעה כל שבוע</p>
        <div className="flex gap-2">
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className={inputClass}
          >
            {WEEKDAY_NAMES.map((name, i) => (
              <option key={i} value={i}>
                יום {name}
              </option>
            ))}
          </select>
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={savingDefault}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white py-3 min-h-[48px] text-sm font-bold hover:bg-violet-700 disabled:opacity-60 transition"
        >
          {savingDefault && <Loader2 size={15} className="animate-spin" />}
          {settings ? 'עדכון ברירת המחדל השבועית' : 'הפעלת אימון מחזורי'}
        </button>
      </form>

      {next && (
        <div className="border-t border-violet-50 pt-3.5">
          {!overrideOpen ? (
            <button
              type="button"
              onClick={openOverride}
              className="text-xs font-bold text-violet-600 hover:underline"
            >
              שינוי האימון הקרוב בלבד (יום/שעה חד־פעמי, בלי לשנות את הקבוע)
            </button>
          ) : (
            <form onSubmit={handleSaveOverride} className="flex flex-col gap-3">
              <p className="text-xs font-bold text-slate-600">שינוי האימון הקרוב בלבד</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="time"
                  required
                  value={overrideTime}
                  onChange={(e) => setOverrideTime(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={savingOverride}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 text-white py-3 min-h-[48px] text-sm font-bold hover:bg-slate-800 disabled:opacity-60 transition"
              >
                {savingOverride && <Loader2 size={15} className="animate-spin" />}
                שמירה
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
