'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { updateTeamGameResult, type TeamGame } from '@/lib/teamHooks';

interface SetInput {
  our: string;
  opponent: string;
}

type SetWinner = 'our' | 'opponent' | null;

function setWinner(s: SetInput): SetWinner {
  if (s.our === '' || s.opponent === '') return null;
  const our = Number(s.our);
  const opponent = Number(s.opponent);
  if (Number.isNaN(our) || Number.isNaN(opponent) || our === opponent) return null;
  return our > opponent ? 'our' : 'opponent';
}

function toEditable(set?: { our: number; opponent: number }): SetInput {
  return set ? { our: String(set.our), opponent: String(set.opponent) } : { our: '', opponent: '' };
}

export default function MatchResultModal({
  game,
  adminUid,
  onClose,
}: {
  game: TeamGame;
  adminUid: string;
  onClose: () => void;
}) {
  const [set1, setSet1] = useState<SetInput>(toEditable(game.sets?.[0]));
  const [set2, setSet2] = useState<SetInput>(toEditable(game.sets?.[1]));
  const [set3, setSet3] = useState<SetInput>(toEditable(game.sets?.[2]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const w1 = setWinner(set1);
  const w2 = setWinner(set2);
  const needsSet3 = w1 !== null && w2 !== null && w1 !== w2;
  const w3 = needsSet3 ? setWinner(set3) : null;

  const setsWon = {
    our: [w1, w2, w3].filter((w) => w === 'our').length,
    opponent: [w1, w2, w3].filter((w) => w === 'opponent').length,
  };
  const isValid = w1 !== null && w2 !== null && (!needsSet3 || w3 !== null);
  const matchWinner: SetWinner = isValid ? (setsWon.our > setsWon.opponent ? 'our' : 'opponent') : null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setError('יש למלא תוצאה תקינה לכל מערכה (לא ניתן תיקו)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sets = [set1, set2, ...(needsSet3 ? [set3] : [])].map((s) => ({
        our: Number(s.our),
        opponent: Number(s.opponent),
      }));
      await updateTeamGameResult(game.id, sets, adminUid);
      onClose();
    } catch (err) {
      console.error('Failed to save match result:', err);
      setError('שמירת התוצאה נכשלה, נסי שוב');
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
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800">תוצאה מול {game.opponentName}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <SetInputRow label="מערכה 1" value={set1} onChange={setSet1} winner={w1} />
          <SetInputRow label="מערכה 2" value={set2} onChange={setSet2} winner={w2} />
          <SetInputRow
            label="מערכה 3"
            value={set3}
            onChange={setSet3}
            winner={w3}
            disabled={!needsSet3}
            hint={!needsSet3 ? 'נדרש רק אם התיקו 1-1 אחרי שתי מערכות' : undefined}
          />

          {matchWinner && (
            <div
              className={`rounded-2xl px-4 py-3 text-center text-sm font-extrabold ${
                matchWinner === 'our' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {matchWinner === 'our' ? 'ניצחון' : 'הפסד'} · {setsWon.our} - {setsWon.opponent}
            </div>
          )}

          {error && (
            <p className="text-sm font-semibold text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !isValid}
            className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 text-white px-5 py-4 min-h-[52px] text-[15px] font-bold hover:bg-violet-700 disabled:opacity-40 transition"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            שמירת תוצאה
          </button>
        </form>
      </div>
    </div>
  );
}

function SetInputRow({
  label,
  value,
  onChange,
  winner,
  disabled,
  hint,
}: {
  label: string;
  value: SetInput;
  onChange: (v: SetInput) => void;
  winner: SetWinner;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          disabled={disabled}
          required={!disabled}
          value={value.our}
          onChange={(e) => onChange({ ...value, our: e.target.value })}
          placeholder="אנחנו"
          className={`flex-1 rounded-xl border px-3 py-3 min-h-[48px] text-center text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 transition disabled:bg-slate-50 ${
            winner === 'our'
              ? 'border-emerald-300 bg-emerald-50 focus:ring-emerald-100'
              : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
          }`}
        />
        <span className="text-slate-300 font-bold">:</span>
        <input
          type="number"
          inputMode="numeric"
          disabled={disabled}
          required={!disabled}
          value={value.opponent}
          onChange={(e) => onChange({ ...value, opponent: e.target.value })}
          placeholder="יריבה"
          className={`flex-1 rounded-xl border px-3 py-3 min-h-[48px] text-center text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 transition disabled:bg-slate-50 ${
            winner === 'opponent'
              ? 'border-rose-300 bg-rose-50 focus:ring-rose-100'
              : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
          }`}
        />
      </div>
    </div>
  );
}
