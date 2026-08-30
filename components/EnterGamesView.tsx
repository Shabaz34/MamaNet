'use client';

import { useState, type FormEvent } from 'react';
import { ChevronRight, Loader2, Trash2, Trophy } from 'lucide-react';
import { useTeamGames, addTeamGame, deleteTeamGame } from '@/lib/teamHooks';

export default function EnterGamesView({
  teamCode,
  captainUid,
  onBack,
}: {
  teamCode: string;
  captainUid: string;
  onBack: () => void;
}) {
  const games = useTeamGames(teamCode);
  const [form, setForm] = useState({ opponentName: '', date: '', time: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...games].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.opponentName.trim() || !form.date || !form.time) return;
    setSaving(true);
    setError(null);
    try {
      await addTeamGame(teamCode, { ...form, opponentName: form.opponentName.trim() }, captainUid);
      setForm({ opponentName: '', date: '', time: '' });
    } catch (err) {
      console.error('Failed to add game:', err);
      setError('שמירת המשחק נכשלה, נסי שוב');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(gameId: string) {
    try {
      await deleteTeamGame(gameId);
    } catch (err) {
      console.error('Failed to delete game:', err);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="חזרה למסך הבית"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition shrink-0"
        >
          <ChevronRight size={20} />
        </button>
        <h2 className="text-lg font-extrabold text-slate-800">הזנת משחקים</h2>
      </div>

      <form onSubmit={handleAdd} className="rounded-3xl border border-violet-100 bg-white shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <Trophy size={17} className="text-violet-600" />
          </span>
          <p className="text-sm font-bold text-slate-800">הוספת משחק חדש</p>
        </div>

        <label className="flex flex-col gap-1.5 text-right">
          <span className="text-xs font-bold text-slate-500">שם קבוצה יריבה</span>
          <input
            required
            value={form.opponentName}
            onChange={(e) => setForm((f) => ({ ...f, opponentName: e.target.value }))}
            placeholder="לדוגמה: מאמאנט רעננה"
            className="rounded-xl border border-slate-200 px-4 py-3.5 min-h-[52px] text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
          />
        </label>

        <div className="flex gap-2">
          <label className="flex-1 flex flex-col gap-1.5 text-right">
            <span className="text-xs font-bold text-slate-500">תאריך המשחק</span>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-3.5 min-h-[52px] text-[15px] text-slate-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
          </label>
          <label className="flex-1 flex flex-col gap-1.5 text-right">
            <span className="text-xs font-bold text-slate-500">שעת המשחק</span>
            <input
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-3.5 min-h-[52px] text-[15px] text-slate-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
          </label>
        </div>

        {error && <p className="text-sm font-semibold text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white px-5 py-4 min-h-[52px] text-[15px] font-bold hover:bg-violet-700 disabled:opacity-60 transition"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          הוספת משחק
        </button>
      </form>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-sm font-extrabold text-slate-800">המשחקים שהוזנו</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-400">עוד לא הוזנו משחקים.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 min-h-[52px]"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">מול {g.opponentName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {g.date} · {g.time}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(g.id)}
                  aria-label="מחיקת משחק"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
