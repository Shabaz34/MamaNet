'use client';

import { useState } from 'react';
import { LayoutGrid, Trophy } from 'lucide-react';
import { useTeamGames } from '@/lib/teamHooks';
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
}: {
  teamCode: string;
  isCoach?: boolean;
  coachUid?: string;
}) {
  const games = useTeamGames(teamCode);
  const [lineupOpen, setLineupOpen] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextGame = [...games]
    .filter((g) => g.date >= todayStr)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  if (!nextGame) return null;

  return (
    <div className="rounded-3xl bg-white border border-amber-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
          <Trophy size={18} className="text-amber-600" />
        </span>
        <div>
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">המשחק הבא</p>
          <p className="text-[15px] font-extrabold text-slate-800 leading-snug text-balance">מול {nextGame.opponentName}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatGameDate(nextGame.date)}
            {nextGame.time ? ` · ${nextGame.time}` : ''}
          </p>
        </div>
      </div>

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
