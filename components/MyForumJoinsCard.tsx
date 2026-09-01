'use client';

import { useState } from 'react';
import { Loader2, LogOut, Megaphone, Users } from 'lucide-react';
import { useTeamInfo, useTeamRoster } from '@/lib/teamHooks';
import {
  ATTENDANCE_TARGET,
  WEEKDAY_NAMES,
  formatDateKey,
  removeTrainingGuest,
  sessionDateTime,
  useTrainingGuests,
  useTrainingRsvps,
} from '@/lib/trainingHooks';
import { useMyForumJoins, type MyForumJoin } from '@/lib/forumHooks';

// Trainings this player joined as a substitute via the forum, for teams
// other than her own — shown on her own dashboard since a joined session
// drops off the browsable forum once it's full (see SubstitutesForumView).
export default function MyForumJoinsCard({ playerUid, teamCode }: { playerUid: string; teamCode: string }) {
  const joins = useMyForumJoins(playerUid, teamCode);
  const now = new Date();
  // Firestore's own collectionGroup listener can lag a beat on this
  // client's *own* delete — cancelling and immediately re-reading the same
  // query sometimes only reflects the change after the listener
  // re-subscribes (e.g. switching views and back), not on this render.
  // Track cancelled ids locally so the row disappears the instant the
  // delete call resolves, without waiting on (or requiring a remount to
  // pick up) that round trip.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const upcoming = joins.filter(
    (j) => j.dateKey && j.time && sessionDateTime(j.dateKey, j.time) > now && !dismissedIds.has(j.id),
  );

  if (upcoming.length === 0) return null;

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
  }

  return (
    <div className="rounded-3xl bg-white border border-violet-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
          <Megaphone size={16} className="text-violet-600" />
        </span>
        <p className="text-sm font-bold text-slate-800">ההשלמות שלי</p>
      </div>

      <ul className="flex flex-col gap-2">
        {upcoming.map((join) => (
          <MyJoinRow key={join.id} join={join} onCancelled={() => handleDismiss(join.id)} />
        ))}
      </ul>
    </div>
  );
}

function MyJoinRow({ join, onCancelled }: { join: MyForumJoin; onCancelled: () => void }) {
  const team = useTeamInfo(join.teamCode);
  const roster = useTeamRoster(join.teamCode);
  const rsvps = useTrainingRsvps(join.teamCode, join.dateKey);
  const guests = useTrainingGuests(join.teamCode, join.dateKey);
  const [saving, setSaving] = useState(false);

  const attendingCount = roster.filter((p) => rsvps[p.uid] === 'coming').length;
  const total = attendingCount + guests.length;

  async function handleCancel() {
    setSaving(true);
    try {
      await removeTrainingGuest(join.teamCode, join.dateKey, join.id);
      onCancelled();
    } catch (err) {
      console.error('Failed to cancel forum join:', err);
      setSaving(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{team?.name || join.teamCode}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          יום {WEEKDAY_NAMES[sessionDateTime(join.dateKey, join.time).getDay()]}, {formatDateKey(join.dateKey)} בשעה{' '}
          {join.time}
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span
          className={`flex items-center gap-1 text-xs font-extrabold tabular-nums ${
            total >= ATTENDANCE_TARGET ? 'text-emerald-600' : 'text-violet-600'
          }`}
        >
          <Users size={12} />
          {total}/{ATTENDANCE_TARGET}
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={handleCancel}
          aria-label="ביטול הרשמה"
          className="flex items-center gap-1 rounded-lg text-xs font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 px-2.5 py-2 min-h-[36px] disabled:opacity-60 transition shrink-0"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          ביטול
        </button>
      </div>
    </li>
  );
}
