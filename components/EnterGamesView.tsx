'use client';

import { useState, type FormEvent } from 'react';
import { ChevronRight, Loader2, Pencil, Trash2, Trophy, X } from 'lucide-react';
import { useTeamGames, addTeamGame, deleteTeamGame, updateTeamGame, type TeamGame } from '@/lib/teamHooks';

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ opponentName: '', date: '', time: '' });
  const [editSaving, setEditSaving] = useState(false);

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

  function startEdit(game: TeamGame) {
    setEditingId(game.id);
    setEditForm({ opponentName: game.opponentName, date: game.date, time: game.time });
  }

  async function handleSaveEdit(e: FormEvent, gameId: string) {
    e.preventDefault();
    if (!editForm.opponentName.trim() || !editForm.date || !editForm.time) return;
    setEditSaving(true);
    try {
      await updateTeamGame(gameId, { ...editForm, opponentName: editForm.opponentName.trim() });
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update game:', err);
    } finally {
      setEditSaving(false);
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
            {sorted.map((g) =>
              editingId === g.id ? (
                <li key={g.id} className="rounded-2xl border border-violet-200 bg-violet-50/40 p-3.5">
                  <form onSubmit={(e) => handleSaveEdit(e, g.id)} className="flex flex-col gap-2.5">
                    <input
                      required
                      value={editForm.opponentName}
                      onChange={(e) => setEditForm((f) => ({ ...f, opponentName: e.target.value }))}
                      placeholder="שם קבוצה יריבה"
                      className="rounded-xl border border-slate-200 px-3 py-2.5 min-h-[44px] text-sm text-slate-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        required
                        value={editForm.date}
                        onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 min-h-[44px] text-sm text-slate-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                      />
                      <input
                        type="time"
                        required
                        value={editForm.time}
                        onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 min-h-[44px] text-sm text-slate-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editSaving}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-white py-2.5 min-h-[40px] text-xs font-bold hover:bg-violet-700 disabled:opacity-60 transition"
                      >
                        {editSaving && <Loader2 size={13} className="animate-spin" />}
                        שמירה
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 text-slate-500 px-3.5 py-2.5 min-h-[40px] text-xs font-bold hover:bg-slate-200 transition"
                      >
                        <X size={13} />
                        ביטול
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
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
                  <div className="flex items-center gap-1 shrink-0">
                    {g.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => startEdit(g)}
                        aria-label="עריכת משחק"
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-violet-50 hover:text-violet-600 transition shrink-0"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id)}
                      aria-label="מחיקת משחק"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
