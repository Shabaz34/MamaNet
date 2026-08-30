// Pure date/schedule math for the weekly recurring training slot — no
// Firebase, no React, no browser globals. Shared by the client hooks
// (lib/trainingHooks.ts) and the server-side notification cron
// (app/api/cron/notify/route.ts), so "when does the next session fall,
// and when does its poll open" is computed identically on both sides.

export const WEEKDAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const ATTENDANCE_TARGET = 12;

export const POLL_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface TrainingSettings {
  weekday: number; // 0 = Sunday .. 6 = Saturday, matches Date#getDay()
  time: string; // "HH:mm"
}

export interface ResolvedTraining {
  defaultDateKey: string; // the never-overridden weekly slot, used as the override doc id
  dateKey: string; // the actual resolved session date (post-override if any)
  time: string;
  isOverridden: boolean;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeDefaultSessionDate(weekday: number, time: string, from: Date): Date {
  const [h, min] = time.split(':').map(Number);
  const result = new Date(from);
  result.setHours(h, min, 0, 0);

  let diff = (weekday - from.getDay() + 7) % 7;
  if (diff === 0 && result.getTime() <= from.getTime()) {
    diff = 7;
  }
  result.setDate(result.getDate() + diff);
  return result;
}

export function sessionDateTime(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00`);
}

export function formatDateKey(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${d}.${m}`;
}

// Resolves the next training occurrence given the weekly default settings
// plus an optional per-occurrence override (date/time keyed by the
// never-changing default slot), as of `now`.
export function resolveNextTraining(
  settings: TrainingSettings | null,
  override: { date: string; time: string } | null,
  now: Date,
): ResolvedTraining | null {
  if (!settings) return null;
  const defaultDateKey = toDateKey(computeDefaultSessionDate(settings.weekday, settings.time, now));

  if (override) {
    return { defaultDateKey, dateKey: override.date, time: override.time, isOverridden: true };
  }
  return { defaultDateKey, dateKey: defaultDateKey, time: settings.time, isOverridden: false };
}
