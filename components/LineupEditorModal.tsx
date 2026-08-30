'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useTeamRoster } from '@/lib/teamHooks';
import { saveSetLineup, savePlannedLineup, useGameLineups, type Lineup, type SetKey } from '@/lib/lineupHooks';
import LineupCourt from './LineupCourt';

const SET_LABELS: Record<SetKey, string> = { set1: 'מערכה 1', set2: 'מערכה 2', set3: 'מערכה 3' };
const EMPTY_SET_LINEUPS: Record<SetKey, Lineup> = { set1: {}, set2: {}, set3: {} };

export default function LineupEditorModal({
  gameId,
  teamCode,
  coachUid,
  opponentName,
  mode,
  setCount = 3,
  onClose,
}: {
  gameId: string;
  teamCode: string;
  coachUid: string;
  opponentName: string;
  mode: 'planned' | 'sets';
  setCount?: number;
  onClose: () => void;
}) {
  const roster = useTeamRoster(teamCode);
  const lineups = useGameLineups(gameId);

  const [plannedLineup, setPlannedLineup] = useState<Lineup>({});
  const [setLineups, setSetLineupsState] = useState<Record<SetKey, Lineup>>(EMPTY_SET_LINEUPS);
  const [activeSet, setActiveSet] = useState<SetKey>('set1');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!lineups || hydrated.current) return;
    hydrated.current = true;
    if (lineups.plannedLineup) setPlannedLineup(lineups.plannedLineup);
    if (lineups.setLineups) {
      setSetLineupsState({
        set1: lineups.setLineups.set1 ?? {},
        set2: lineups.setLineups.set2 ?? {},
        set3: lineups.setLineups.set3 ?? {},
      });
    }
  }, [lineups]);

  const availableSetKeys: SetKey[] = setCount >= 3 ? ['set1', 'set2', 'set3'] : ['set1', 'set2'];

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === 'planned') {
        await savePlannedLineup(gameId, teamCode, plannedLineup, coachUid);
        onClose();
      } else {
        await saveSetLineup(gameId, teamCode, activeSet, setLineups[activeSet], coachUid);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
      }
    } catch (err) {
      console.error('Failed to save lineup:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800">
            {mode === 'planned' ? 'קביעת שישייה' : 'קביעת שישיות לפי מערכה'} · מול {opponentName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {mode === 'sets' && (
          <div className="flex gap-1.5 bg-slate-100 rounded-2xl p-1">
            {availableSetKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSet(key)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  activeSet === key ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {SET_LABELS[key]}
              </button>
            ))}
          </div>
        )}

        <LineupCourt
          roster={roster}
          lineup={mode === 'planned' ? plannedLineup : setLineups[activeSet]}
          onChange={(next) => {
            if (mode === 'planned') setPlannedLineup(next);
            else setSetLineupsState((prev) => ({ ...prev, [activeSet]: next }));
          }}
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white px-5 py-4 min-h-[52px] text-[15px] font-bold hover:bg-violet-700 disabled:opacity-60 transition"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {savedFlash ? 'נשמר ✓' : 'שמירת שישייה'}
        </button>
      </div>
    </div>
  );
}
