'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, LayoutGrid, Pencil, Trophy } from 'lucide-react';
import { useTeamGames, type TeamGame } from '@/lib/teamHooks';
import MatchResultModal from './MatchResultModal';
import LineupEditorModal from './LineupEditorModal';

function formatGameDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function monthGroupKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function formatMonthLabel(dateStr: string): string {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function hasBeenPlayed(game: TeamGame): boolean {
  const kickoff = new Date(`${game.date}T${game.time || '00:00'}:00`);
  if (Number.isNaN(kickoff.getTime())) return false;
  return kickoff.getTime() <= Date.now();
}

export default function MatchHistoryView({
  teamCode,
  isAdmin,
  adminUid,
  isCoach,
  onBack,
}: {
  teamCode: string;
  isAdmin: boolean;
  adminUid?: string;
  isCoach?: boolean;
  onBack: () => void;
}) {
  const games = useTeamGames(teamCode);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingGame, setEditingGame] = useState<TeamGame | null>(null);
  const [lineupGame, setLineupGame] = useState<TeamGame | null>(null);

  const sorted = [...games].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const visible = isAdmin ? sorted : sorted.filter((g) => g.status === 'completed');

  const monthGroups = new Map<string, TeamGame[]>();
  for (const g of visible) {
    const key = monthGroupKey(g.date);
    if (!monthGroups.has(key)) monthGroups.set(key, []);
    monthGroups.get(key)!.push(g);
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
        <h2 className="text-lg font-extrabold text-slate-800">היסטוריית משחקים</h2>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl bg-white border border-violet-100 shadow-sm p-6 text-center text-sm text-slate-400">
          עוד אין משחקים להצגה.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Array.from(monthGroups.entries()).map(([key, monthGames]) => (
            <section key={key} className="flex flex-col gap-2.5">
              <h3 className="text-xs font-extrabold text-violet-500 uppercase tracking-wide px-1">
                {formatMonthLabel(monthGames[0].date)}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {monthGames.map((g) => (
                  <MatchHistoryRow
                    key={g.id}
                    game={g}
                    isOpen={expandedId === g.id}
                    onToggle={() => setExpandedId((cur) => (cur === g.id ? null : g.id))}
                    canEditResult={isAdmin && Boolean(adminUid) && hasBeenPlayed(g)}
                    onEdit={() => setEditingGame(g)}
                    canEditLineup={Boolean(isCoach) && Boolean(adminUid) && hasBeenPlayed(g)}
                    onEditLineup={() => setLineupGame(g)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {isAdmin && adminUid && editingGame && (
        <MatchResultModal game={editingGame} adminUid={adminUid} onClose={() => setEditingGame(null)} />
      )}

      {isCoach && adminUid && lineupGame && (
        <LineupEditorModal
          gameId={lineupGame.id}
          teamCode={teamCode}
          coachUid={adminUid}
          opponentName={lineupGame.opponentName}
          mode="sets"
          setCount={lineupGame.sets?.length ?? 3}
          onClose={() => setLineupGame(null)}
        />
      )}
    </div>
  );
}

function MatchHistoryRow({
  game: g,
  isOpen,
  onToggle,
  canEditResult,
  onEdit,
  canEditLineup,
  onEditLineup,
}: {
  game: TeamGame;
  isOpen: boolean;
  onToggle: () => void;
  canEditResult: boolean;
  onEdit: () => void;
  canEditLineup: boolean;
  onEditLineup: () => void;
}) {
  const isCompleted = g.status === 'completed' && Boolean(g.sets) && Boolean(g.setsWon);

  return (
    <li className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => isCompleted && onToggle()}
        className="w-full flex items-center justify-between gap-3 p-4 min-h-[64px] text-right"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              !isCompleted ? 'bg-slate-100' : g.result === 'win' ? 'bg-emerald-50' : 'bg-rose-50'
            }`}
          >
            <Trophy
              size={16}
              className={!isCompleted ? 'text-slate-400' : g.result === 'win' ? 'text-emerald-600' : 'text-rose-500'}
            />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">מול {g.opponentName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatGameDate(g.date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCompleted ? (
            <>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                  g.result === 'win' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {g.result === 'win' ? 'ניצחון' : 'הפסד'}
              </span>
              <span className="text-sm font-extrabold text-slate-700 tabular-nums">
                {g.setsWon!.our} - {g.setsWon!.opponent}
              </span>
            </>
          ) : (
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
              {hasBeenPlayed(g) ? 'ממתין לתוצאה' : 'משחק עתידי'}
            </span>
          )}

          {canEditResult && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onEdit();
                }
              }}
              aria-label="עריכת תוצאה"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition cursor-pointer"
            >
              <Pencil size={14} />
            </span>
          )}

          {isCompleted && (
            <ChevronDown size={16} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {isOpen && isCompleted && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 flex flex-col gap-1.5 animate-[fade-in_0.15s_ease-out]">
          {g.sets!.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm text-slate-600">
              <span>מערכה {i + 1}</span>
              <span className="font-bold tabular-nums">
                {s.our} - {s.opponent}
              </span>
            </div>
          ))}
        </div>
      )}

      {canEditLineup && (
        <button
          type="button"
          onClick={onEditLineup}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-t border-slate-100 text-xs font-bold text-violet-600 hover:bg-violet-50 transition"
        >
          <LayoutGrid size={13} />
          קבע שישייה
        </button>
      )}
    </li>
  );
}
