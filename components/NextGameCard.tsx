'use client';

import { useState, type FormEvent } from 'react';
import { LayoutGrid, Loader2, Pencil, Trophy, X } from 'lucide-react';
import { useTeamGames, updateTeamGame } from '@/lib/teamHooks';
import { isWithinNearTerm } from '@/lib/trainingHooks';
import LineupEditorModal from './LineupEditorModal';

function formatGameDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
}

export default function NextGameCard({
  teamCode,
  isCoach,
  coachUid,
  canEdit = false,
}: {
  teamCode: string;
  isCoach?: boolean;
  coachUid?: string;
  /** Whether this viewer may edit the next game's opponent/date/time —
   * true for the coach, and for the captain (team_games' update rule
   * allows either role). */
  canEdit?: boolean;
}) {
  const games = useTeamGames(teamCode);
  const [lineupOpen, setLineupOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ opponentName: '', date: '', time: '' });
  const [saving, setSaving] = useState(false);

  // Only show a game coming up within the next week — a match scheduled a
  // month out shouldn't clutter the home screen yet.
  const now = new Date();
  const nextGame = [...games]
    .filter((g) => g.date && g.time && isWithinNearTerm(new Date(`${g.date}T${g.time}:00`), now))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  if (!nextGame) return null;

  function startEdit() {
    setEditForm({ opponentName: nextGame.opponentName, date: nextGame.date, time: nextGame.time });
    setEditing(true);
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editForm.opponentName.trim() || !editForm.date || !editForm.time) return;
    setSaving(true);
    try {
      await updateTeamGame(nextGame.id, { ...editForm, opponentName: editForm.opponentName.trim() });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update game:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white border border-amber-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
          <Trophy size={18} className="text-amber-600" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">המשחק הבא</p>
          <p className="text-[15px] font-extrabold text-slate-800 leading-snug text-balance">מול {nextGame.opponentName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatGameDate(nextGame.date)}
            {nextGame.time ? ` · ${nextGame.time}` : ''}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="עריכת המשחק הבא"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition shrink-0"
          >
            <Pencil size={15} />
          </button>
        )}
      </div>

      {editing && (
        <form
          onSubmit={handleSaveEdit}
          className="flex flex-col gap-2.5 border-t border-amber-50 pt-3.5 animate-[fade-in_0.15s_ease-out]"
        >
          <input
            required
            value={editForm.opponentName}
            onChange={(e) => setEditForm((f) => ({ ...f, opponentName: e.target.value }))}
            placeholder="שם קבוצה יריבה"
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 min-h-[44px] text-sm text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
          />
          <div className="flex gap-2">
            <input
              type="date"
              required
              value={editForm.date}
              onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 min-h-[44px] text-sm text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            />
            <input
              type="time"
              required
              value={editForm.time}
              onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 min-h-[44px] text-sm text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-white py-2.5 min-h-[40px] text-xs font-bold hover:bg-amber-600 disabled:opacity-60 transition"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              שמירה
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 text-slate-500 px-3.5 py-2.5 min-h-[40px] text-xs font-bold hover:bg-slate-200 transition"
            >
              <X size={13} />
              ביטול
            </button>
          </div>
        </form>
      )}

      {isCoach && coachUid && (
        <button
          type="button"
          onClick={() => setLineupOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 text-amber-700 px-4 py-3 min-h-[44px] text-sm font-bold hover:bg-amber-100 transition"
        >
          <LayoutGrid size={15} />
          קביעת שישייה למשחק
        </button>
      )}

      {isCoach && coachUid && lineupOpen && (
        <LineupEditorModal
          gameId={nextGame.id}
          teamCode={teamCode}
          coachUid={coachUid}
          opponentName={nextGame.opponentName}
          mode="planned"
          onClose={() => setLineupOpen(false)}
        />
      )}
    </div>
  );
}
